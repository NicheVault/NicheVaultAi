import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  section: {
    margin: 10,
    padding: 10,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  text: {
    fontSize: 12,
    marginBottom: 5,
  },
  header: {
    fontSize: 14,
    marginBottom: 5,
    fontWeight: 'bold',
  },
});

const GuideDocument = ({ niche, problem, solution }: { 
  niche: string;
  problem: string;
  solution: string;
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.title}>NicheAI Implementation Guide</Text>
        <Text style={styles.subtitle}>Niche: {niche}</Text>
        <Text style={styles.subtitle}>Problem: {problem}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.header}>Solution Guide:</Text>
        <Text style={styles.text}>{solution}</Text>
      </View>
    </Page>
  </Document>
);

export const generatePDFLink = (guide: { 
  niche: string;
  problem: string;
  solution: string;
}) => {
  return (
    <PDFDownloadLink
      document={<GuideDocument {...guide} />}
      fileName={`${guide.niche}-${guide.problem}-guide.pdf`}
    >
      {({ loading }) => (loading ? 'Generating PDF...' : 'Download PDF')}
    </PDFDownloadLink>
  );
};

export default GuideDocument; 