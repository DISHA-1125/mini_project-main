"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { PickedLocation } from "@/components/LocationPicker";
const LocationPicker = dynamic(
  () => import("@/components/LocationPicker").then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-[340px] rounded-2xl border border-surface-700/60 bg-surface-900/40 flex items-center justify-center text-surface-500 text-sm">
        Loading map…
      </div>
    ),
  }
);

export function ReportItemModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [itemType, setItemType] = useState<"LOST" | "FOUND">("LOST");
  const [selectedLocation, setSelectedLocation] = useState<PickedLocation | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedLocation) {
      toast.error("Please select a location on the map.");
      return;
    }

    setLoading(true);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        category: form.get("category"),
        type: itemType,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        address: selectedLocation.label,
        verificationQ: form.get("verificationQ") || undefined,
        verificationA: form.get("verificationA") || undefined,
      }),
    });

    setLoading(false);
    if (res.ok) {
      toast.success("Item reported successfully!");
      setOpen(false);
      setSelectedLocation(null);
      router.refresh();
    } else {
      toast.error("Failed to report item");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedLocation(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4" />
          Report Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Lost or Found Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <Tabs value={itemType} onValueChange={(v) => setItemType(v as "LOST" | "FOUND")}>
            <TabsList className="w-full">
              <TabsTrigger value="LOST" className="flex-1">Lost</TabsTrigger>
              <TabsTrigger value="FOUND" className="flex-1">Found</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="e.g. Black iPhone 14" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" required placeholder="Describe the item..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" required placeholder="Electronics, Bags, etc." />
          </div>

          <LocationPicker
            value={selectedLocation}
            onChange={(location) => setSelectedLocation(location)}
          />

          <div className="space-y-2">
            <Label htmlFor="verificationQ">Verification Question (optional)</Label>
            <Input id="verificationQ" name="verificationQ" placeholder="Ask claimant something only owner knows" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verificationA">Answer</Label>
            <Input id="verificationA" name="verificationA" placeholder="Secret answer for claim verification" />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !selectedLocation}>
            {loading ? "Submitting..." : "Submit Report"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
