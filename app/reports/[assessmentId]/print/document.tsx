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
  page: { padding: 24 },
  header: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#555" },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 6 },
  text: { fontSize: 10, lineHeight: 1.4 },
  listItem: { fontSize: 10, marginBottom: 2 },
  statsRow: { display: "flex", flexDirection: "row", gap: 8, marginTop: 4 },
  pill: {
    fontSize: 9,
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
  },
  issueRow: { marginBottom: 6 },
  issueTitle: { fontSize: 10, fontWeight: 600 },
  smallMuted: { fontSize: 9, color: "#666" },
  personaRow: { marginBottom: 8 },
  personaName: { fontSize: 10, fontWeight: 600 },
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
            Assessment: {assessmentName ?? assessmentId} ({assessmentId})
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
            {overview ? <Text style={styles.text}>{overview}</Text> : null}
            {stats ? (
              <View style={styles.statsRow}>
                <Text style={styles.pill}>Critical: {stats.critical}</Text>
                <Text style={styles.pill}>High: {stats.high}</Text>
                <Text style={styles.pill}>Medium: {stats.medium}</Text>
                <Text style={styles.pill}>Low: {stats.low}</Text>
                <Text style={styles.pill}>Total: {stats.total}</Text>
              </View>
            ) : null}
            {topRisks && topRisks.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Risks</Text>
                {topRisks.map((r, i) => (
                  <Text key={`risk-${i}`} style={styles.listItem}>
                    • {r}
                  </Text>
                ))}
              </View>
            ) : null}
            {quickWins && quickWins.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Wins</Text>
                {quickWins.map((w, i) => (
                  <Text key={`win-${i}`} style={styles.listItem}>
                    • {w}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        )}

        {/* Issues Summary */}
        {issues && issues.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Issues</Text>
            {issues.map((iss) => (
              <View key={iss.id} style={styles.issueRow}>
                <Text style={styles.issueTitle}>{iss.title}</Text>
                <Text style={styles.smallMuted}>
                  Severity: {iss.severity ?? "Unspecified"}
                  {iss.wcag_codes && iss.wcag_codes.length
                    ? ` | WCAG: ${iss.wcag_codes.join(", ")}`
                    : ""}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.smallMuted}>No issues to display.</Text>
          </View>
        )}

        {/* Persona Summaries */}
        {personaSummaries && personaSummaries.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Persona Summaries</Text>
            {personaSummaries.map((p, i) => (
              <View key={`persona-${i}`} style={styles.personaRow}>
                <Text style={styles.personaName}>{p.persona}</Text>
                <Text style={styles.text}>{p.summary}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
};
