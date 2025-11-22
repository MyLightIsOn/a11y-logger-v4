import { Document, Page, Text, View } from "@react-pdf/renderer";

export const MyDocument = () => {
  return (
    <Document author="Author" title="My Document">
      <Page size="A4">
        <View style={{ padding: 10 }}>
          <Text>Hello World!</Text>
        </View>
      </Page>
    </Document>
  );
};
