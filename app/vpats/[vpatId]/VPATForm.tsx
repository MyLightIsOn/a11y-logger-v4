import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getAllWcagCriteria } from "@/lib/vpat/utils";

function VpatForm({ vpat }) {
  const { register, reset, getValues } = useForm({
    defaultValues: {
      title: vpat?.title ?? "",
      description: vpat?.description ?? "",
    },
  });

  const criteriaArray = getAllWcagCriteria();

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
    <div>
      <form>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-card rounded-lg shadow-md border border-border mb-4">
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

        {[
          { level: "A", label: "Table 1: Success Criteria, Level A" },
          { level: "AA", label: "Table 2: Success Criteria, Level AA" },
          { level: "AAA", label: "Table 3: Success Criteria, Level AAA" },
        ].map(({ level, label }) => {
          const rows = criteriaArray.filter(
            (row) =>
              (row.level || row.level || "").toString().toUpperCase() === level,
          );
          return (
            <div
              key={level}
              className="p-4 bg-card rounded-lg shadow-md border border-border"
            >
              <table className="w-full border-collapse">
                <caption className="text-left font-semibold p-3">
                  {label}
                </caption>
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-3 w-[22rem]">Criterion</th>
                    <th className="p-3 w-[10rem]">Conformance</th>
                    <th className="p-3">Remarks</th>
                    <th className="p-3 w-[5rem] text-center">Issues</th>
                    <th className="p-3 w-[5rem] text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.code}`} className="border-t">
                      <td className="p-3 align-top">
                        <div className="font-medium">
                          {row.code} — {row.name}
                        </div>
                      </td>
                      <td className="p-3 align-top">{row.name}</td>
                      <td className="p-3 align-top">{row.name}</td>
                      <td className="p-3 align-top text-center">{row.name}</td>
                      <td className="p-3 align-top text-center">{row.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </form>
    </div>
  );
}

export default VpatForm;
