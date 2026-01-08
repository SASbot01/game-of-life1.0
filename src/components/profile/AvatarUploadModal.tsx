import { useState, useRef } from 'react';
import { Upload, X, Loader2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface AvatarUploadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AvatarUploadModal({ open, onOpenChange }: AvatarUploadModalProps) {
    const { user, profile, refreshProfile } = useAuth();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            toast.error('Invalid file type. Please upload a JPG, PNG, or WebP image.');
            return;
        }

        // Validate file size (2MB max)
        const maxSize = 2 * 1024 * 1024; // 2MB in bytes
        if (file.size > maxSize) {
            toast.error('File too large. Maximum size is 2MB.');
            return;
        }

        setSelectedFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        if (!selectedFile || !user) return;

        setUploading(true);

        try {
            // Generate unique filename
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            console.log('📸 Uploading avatar:', fileName);

            // Delete old avatar if exists
            if (profile?.avatar_url) {
                const oldPath = profile.avatar_url.split('/').slice(-2).join('/');
                console.log('🗑️ Deleting old avatar:', oldPath);
                await supabase.storage.from('avatars').remove([oldPath]);
            }

            // Upload new avatar
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, selectedFile, {
                    cacheControl: '3600',
                    upsert: true,
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw uploadError;
            }

            console.log('✅ Upload successful:', uploadData);

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            console.log('🔗 Public URL:', publicUrl);

            // Update profile with new avatar URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) {
                console.error('Profile update error:', updateError);
                throw updateError;
            }

            console.log('✅ Profile updated with new avatar');

            // Refresh profile to update UI
            await refreshProfile();

            toast.success('Profile picture updated successfully!');

            // Close modal and reset state
            onOpenChange(false);
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            toast.error(error.message || 'Failed to upload profile picture');
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display flex items-center gap-2">
                        <Camera className="w-5 h-5 text-primary" />
                        UPLOAD PROFILE PICTURE
                    </DialogTitle>
                    <DialogDescription>
                        Choose a profile picture. Max size: 2MB. Formats: JPG, PNG, WebP.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Preview Area */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="avatar-frame w-32 h-32">
                                <div className="avatar-frame-inner w-full h-full flex items-center justify-center overflow-hidden">
                                    {previewUrl ? (
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : profile?.avatar_url ? (
                                        <img
                                            src={profile.avatar_url}
                                            alt="Current avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-card flex items-center justify-center">
                                            <Upload className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            {selectedFile && (
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                                    onClick={handleRemove}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* File Input */}
                    <div className="space-y-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/jpg"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="avatar-upload"
                        />
                        <label htmlFor="avatar-upload">
                            <Button
                                variant="outline"
                                className="w-full"
                                asChild
                            >
                                <span className="cursor-pointer">
                                    <Upload className="w-4 h-4 mr-2" />
                                    {selectedFile ? 'Choose Different Image' : 'Choose Image'}
                                </span>
                            </Button>
                        </label>
                    </div>

                    {/* Selected File Info */}
                    {selectedFile && (
                        <div className="text-xs text-muted-foreground text-center font-mono">
                            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => onOpenChange(false)}
                            disabled={uploading}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleUpload}
                            disabled={!selectedFile || uploading}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
