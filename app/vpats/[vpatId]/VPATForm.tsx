import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function VpatForm({ vpat }) {
  const { register, reset, getValues } = useForm({
    defaultValues: {
      title: vpat?.title ?? "",
      description: vpat?.description ?? "",
    },
  });

  // Reset all currently registered fields based on incoming vpat without listing them one by one
  useEffect(() => {
    if (!vpat) return;
    const currentKeys = Object.keys(getValues());
    const nextValues = currentKeys.reduce(
      (acc, key) => {
        acc[key] = vpat?.[key] ?? "";
        return acc;
      },
      {} as Record<string, unknown>,
    );
    reset(nextValues);
  }, [vpat, reset, getValues]);

  return (
    <div className={"bg-card rounded-lg shadow-md border border-border"}>
      <form>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="vpat-title" className="block text-xl font-bold">
              Title<span className={"text-destructive"}>*</span>
            </Label>
            <Input id="vpat-title" {...register("title")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vpat-title" className="block text-xl font-bold">
              Description
            </Label>
            <Input id="vpat-description" {...register("description")} />
          </div>
        </div>
      </form>
    </div>
  );
}

export default VpatForm;
