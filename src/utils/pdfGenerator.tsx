import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font, BlobProvider } from '@react-pdf/renderer';

// Register fonts
Font.register({
  family: 'System',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 'normal' },
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmWUlvAw.ttf', fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'System',
  },
  section: {
    margin: 10,
    padding: 10,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
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

interface GuideDocumentProps {
  niche: string;
  problem: string;
  solution: string;
}

const GuideDocument: React.FC<GuideDocumentProps> = ({ niche, problem, solution }) => (
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

export const generatePDFLink = (guide: GuideDocumentProps) => {
  return (
    <BlobProvider document={<GuideDocument {...guide} />}>
      {({ loading, url }) => (
        <a 
          href={url || '#'} 
          download={`${guide.niche.replace(/[^a-zA-Z0-9]/g, '-')}-guide.pdf`.toLowerCase()}
          className="text-purple-400 hover:text-purple-300 transition-colors"
          style={{ pointerEvents: loading ? 'none' : 'auto' }}
        >
          {loading ? 'Generating PDF...' : 'Download PDF'}
        </a>
      )}
    </BlobProvider>
  );
};

export default GuideDocument; 