import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";

interface GuestIntakeFormProps {
  userId: string;
  collaborationId: string;
  existingProfileId: string | null;
  onComplete: (profileId: string) => void;
}

interface SocialLinks {
  [key: string]: string | undefined;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  youtube?: string;
}

export default function GuestIntakeForm({
  userId,
  collaborationId,
  existingProfileId,
  onComplete,
}: GuestIntakeFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [topics, setTopics] = useState("");
  const [pronunciationNotes, setPronunciationNotes] = useState("");
  const [headshotUrl, setHeadshotUrl] = useState<string | null>(null);
  const [headshotFile, setHeadshotFile] = useState<File | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    twitter: "",
    linkedin: "",
    instagram: "",
    youtube: "",
  });

  // Load existing profile if any
  useEffect(() => {
    async function loadProfile() {
      if (!existingProfileId) {
        // Get user email for default
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) setEmail(user.email);
        return;
      }

      const { data } = await supabase
        .from("guest_profiles")
        .select("*")
        .eq("id", existingProfileId)
        .single();

      if (data) {
        setName(data.name);
        setEmail(data.email);
        setBio(data.bio || "");
        setWebsiteUrl(data.website_url || "");
        setTopics(data.topics?.join(", ") || "");
        setPronunciationNotes(data.pronunciation_notes || "");
        setHeadshotUrl(data.headshot_url);
        if (data.social_links && typeof data.social_links === 'object') {
          setSocialLinks(data.social_links as SocialLinks);
        }
      }
    }

    loadProfile();
  }, [existingProfileId]);

  async function handleHeadshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setHeadshotFile(file);
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setHeadshotUrl(previewUrl);
  }

  async function uploadHeadshot(): Promise<string | null> {
    if (!headshotFile) return headshotUrl;

    setIsUploading(true);
    try {
      const fileExt = headshotFile.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("headshots")
        .upload(fileName, headshotFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("headshots")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Upload headshot if new file selected
      const finalHeadshotUrl = await uploadHeadshot();

      // Prepare topics array
      const topicsArray = topics
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      let profileId: string;

      if (existingProfileId) {
        // Update existing profile
        const { error } = await supabase
          .from("guest_profiles")
          .update({
            user_id: userId,
            name,
            email,
            bio,
            website_url: websiteUrl || null,
            topics: topicsArray.length > 0 ? topicsArray : null,
            pronunciation_notes: pronunciationNotes || null,
            headshot_url: finalHeadshotUrl,
            social_links: socialLinks as unknown as Record<string, string>,
          })
          .eq("id", existingProfileId);

        if (error) throw error;
        profileId = existingProfileId;
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from("guest_profiles")
          .insert({
            user_id: userId,
            name,
            email,
            bio,
            website_url: websiteUrl || null,
            topics: topicsArray.length > 0 ? topicsArray : null,
            pronunciation_notes: pronunciationNotes || null,
            headshot_url: finalHeadshotUrl,
            social_links: socialLinks as unknown as Record<string, string>,
          })
          .select("id")
          .single();

        if (error) throw error;
        profileId = data.id;
      }

      toast({
        title: "Intake complete!",
        description: "Your profile has been saved.",
      });

      onComplete(profileId);
    } catch (error: any) {
      toast({
        title: "Error saving profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Your Profile</CardTitle>
        <CardDescription>
          This information helps the host prepare for your collaboration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          {/* Headshot Upload */}
          <div className="space-y-2">
            <Label>Headshot</Label>
            <div className="flex items-center gap-4">
              {headshotUrl ? (
                <div className="relative">
                  <img
                    src={headshotUrl}
                    alt="Headshot preview"
                    className="h-20 w-20 rounded-full object-cover border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setHeadshotUrl(null);
                      setHeadshotFile(null);
                    }}
                    className="absolute -top-1 -right-1 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center border border-dashed border-border">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleHeadshotUpload}
                  className="max-w-[200px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG up to 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio *</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself and your expertise..."
              rows={4}
              required
            />
          </div>

          {/* Topics */}
          <div className="space-y-2">
            <Label htmlFor="topics">Topics You Can Discuss</Label>
            <Input
              id="topics"
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              placeholder="Marketing, AI, Startups (comma-separated)"
            />
            <p className="text-xs text-muted-foreground">
              Separate topics with commas
            </p>
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
            />
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <Label>Social Links</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="twitter" className="text-xs text-muted-foreground">
                  Twitter/X
                </Label>
                <Input
                  id="twitter"
                  value={socialLinks.twitter}
                  onChange={(e) =>
                    setSocialLinks({ ...socialLinks, twitter: e.target.value })
                  }
                  placeholder="https://twitter.com/username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin" className="text-xs text-muted-foreground">
                  LinkedIn
                </Label>
                <Input
                  id="linkedin"
                  value={socialLinks.linkedin}
                  onChange={(e) =>
                    setSocialLinks({ ...socialLinks, linkedin: e.target.value })
                  }
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram" className="text-xs text-muted-foreground">
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  value={socialLinks.instagram}
                  onChange={(e) =>
                    setSocialLinks({ ...socialLinks, instagram: e.target.value })
                  }
                  placeholder="https://instagram.com/username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube" className="text-xs text-muted-foreground">
                  YouTube
                </Label>
                <Input
                  id="youtube"
                  value={socialLinks.youtube}
                  onChange={(e) =>
                    setSocialLinks({ ...socialLinks, youtube: e.target.value })
                  }
                  placeholder="https://youtube.com/@channel"
                />
              </div>
            </div>
          </div>

          {/* Pronunciation Notes */}
          <div className="space-y-2">
            <Label htmlFor="pronunciation">Pronunciation Notes</Label>
            <Input
              id="pronunciation"
              value={pronunciationNotes}
              onChange={(e) => setPronunciationNotes(e.target.value)}
              placeholder="How to pronounce your name correctly"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || isUploading}
          >
            {(isSubmitting || isUploading) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isUploading ? "Uploading..." : "Complete Intake"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
