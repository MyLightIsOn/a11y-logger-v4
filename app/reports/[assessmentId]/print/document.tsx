"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type PDFIssue = {
  id: string;
  title: string;
  severity?: "Critical" | "High" | "Medium" | "Low" | string;
  wcag_codes?: string[];
};

export type AssessmentStats = {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
};

export interface MyDocumentProps {
  assessmentId: string;
  assessmentName?: string;
  generatedAt?: string; // ISO string
  stats?: AssessmentStats;
  overview?: string;
  topRisks?: string[];
  quickWins?: string[];
  issues?: PDFIssue[];
  personaSummaries?: { persona: string; summary: string }[];
}

const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: "#FFFFFF" },
  header: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subtitle: { fontSize: 10, color: "#666666", marginTop: 2 },
  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#2D3748",
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#3182CE",
    paddingLeft: 8,
  },
  text: { fontSize: 10, lineHeight: 1.6, color: "#4A5568" },
  listItem: {
    fontSize: 10,
    marginBottom: 4,
    color: "#4A5568",
    paddingLeft: 12,
  },
  statsRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  pill: {
    fontSize: 9,
    fontWeight: 600,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillCritical: {
    borderColor: "#E53E3E",
    color: "#E53E3E",
    backgroundColor: "#FFF5F5",
  },
  pillHigh: {
    borderColor: "#DD6B20",
    color: "#DD6B20",
    backgroundColor: "#FFFAF0",
  },
  pillMedium: {
    borderColor: "#D69E2E",
    color: "#D69E2E",
    backgroundColor: "#FFFFF0",
  },
  pillLow: {
    borderColor: "#3182CE",
    color: "#3182CE",
    backgroundColor: "#EBF8FF",
  },
  pillTotal: {
    borderColor: "#4A5568",
    color: "#4A5568",
    backgroundColor: "#F7FAFC",
  },
  issueRow: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 4,
  },
  issueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  issueTitle: { fontSize: 11, fontWeight: 700, color: "#2D3748" },
  smallMuted: { fontSize: 9, color: "#718096" },
  personaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  personaCard: {
    width: "48%",
    marginBottom: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    backgroundColor: "#F7FAFC",
  },
  personaName: {
    fontSize: 11,
    fontWeight: 700,
    color: "#2B6CB0",
    marginBottom: 4,
  },
});

export const MyDocument = ({
  assessmentId,
  assessmentName,
  generatedAt,
  stats,
  overview,
  topRisks,
  quickWins,
  issues,
  personaSummaries,
}: MyDocumentProps) => {
  const printedAt = generatedAt
    ? new Date(generatedAt).toLocaleString()
    : new Date().toLocaleString();

  return (
    <Document
      author="A11y Logger"
      title={`Accessibility Report - ${assessmentName ?? assessmentId}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Accessibility Assessment Report</Text>
          <Text style={styles.subtitle}>
            Assessment: {assessmentName ?? assessmentId}
          </Text>
          <Text style={styles.subtitle}>Generated: {printedAt}</Text>
        </View>

        {/* Executive Summary */}
        {(overview ||
          (topRisks && topRisks.length) ||
          (quickWins && quickWins.length) ||
          stats) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Executive Summary</Text>
            {overview ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.text}>{overview}</Text>
              </View>
            ) : null}
            {stats ? (
              <View style={styles.statsRow}>
                <Text style={[styles.pill, styles.pillCritical]}>
                  Critical: {stats.critical}
                </Text>
                <Text style={[styles.pill, styles.pillHigh]}>
                  High: {stats.high}
                </Text>
                <Text style={[styles.pill, styles.pillMedium]}>
                  Medium: {stats.medium}
                </Text>
                <Text style={[styles.pill, styles.pillLow]}>
                  Low: {stats.low}
                </Text>
                <Text style={[styles.pill, styles.pillTotal]}>
                  Total: {stats.total}
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: 20 }}>
              {topRisks && topRisks.length ? (
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { fontSize: 12, borderLeftWidth: 2, marginTop: 10 },
                    ]}
                  >
                    Top Risks
                  </Text>
                  {topRisks.map((r, i) => (
                    <Text key={`risk-${i}`} style={styles.listItem}>
                      • {r}
                    </Text>
                  ))}
                </View>
              ) : null}
              {quickWins && quickWins.length ? (
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { fontSize: 12, borderLeftWidth: 2, marginTop: 10 },
                    ]}
                  >
                    Quick Wins
                  </Text>
                  {quickWins.map((w, i) => (
                    <Text key={`win-${i}`} style={styles.listItem}>
                      • {w}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Persona Summaries */}
        {personaSummaries && personaSummaries.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Persona Summaries</Text>
            <View style={styles.personaGrid}>
              {personaSummaries.map((p, i) => (
                <View key={`persona-${i}`} style={styles.personaCard}>
                  <Text style={styles.personaName}>
                    {p.persona.replace("(blind)", "").trim()}
                  </Text>
                  <Text style={styles.text}>{p.summary}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Issues Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Issues</Text>
          {issues && issues.length ? (
            issues.map((iss) => (
              <View key={iss.id} style={styles.issueRow}>
                <View style={styles.issueHeader}>
                  <Text style={styles.issueTitle}>{iss.title}</Text>
                  <Text
                    style={[
                      styles.pill,
                      iss.severity === "1" || iss.severity === "Critical"
                        ? styles.pillCritical
                        : iss.severity === "2" || iss.severity === "High"
                          ? styles.pillHigh
                          : iss.severity === "3" || iss.severity === "Medium"
                            ? styles.pillMedium
                            : styles.pillLow,
                      { fontSize: 7, paddingVertical: 2 },
                    ]}
                  >
                    {iss.severity === "1"
                      ? "Critical"
                      : iss.severity === "2"
                        ? "High"
                        : iss.severity === "3"
                          ? "Medium"
                          : iss.severity === "4" || iss.severity === "Low"
                            ? "Low"
                            : (iss.severity ?? "Low")}
                  </Text>
                </View>
                <Text style={styles.smallMuted}>
                  {iss.wcag_codes && iss.wcag_codes.length
                    ? `WCAG: ${iss.wcag_codes.join(", ")}`
                    : "No WCAG criteria"}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.smallMuted}>No issues to display.</Text>
          )}
        </View>
      </Page>
    </Document>
  );
};
