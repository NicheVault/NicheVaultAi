export interface User {
  id: string;
  name: string;
  email: string;
}

export interface NicheOption {
  name: string;
  category: string;
  description: string;
  potential: string;
  competition: string;
}

export interface ProblemOption {
  title: string;
  description: string;
  audience: string;
  severity: string;
  complexity: string;
  example: string;
} 