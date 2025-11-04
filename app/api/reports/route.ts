import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ReportListItem {
  id: string;
  assessment_id: string;
  created_at: string;
}

interface ReportListResponse {
  data: ReportListItem[];
  count: number;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("reports")
      .select("id, assessment_id, created_at")
      .eq("user_id", user.id);

    if (error) throw error;

    const rows = (data || []) as ReportListItem[];

    const response: ReportListResponse = {
      data: rows,
      count: rows.length,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error listing reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
