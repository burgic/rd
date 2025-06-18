// src/types/auth.ts

export interface SignUpResponse {
    user: {
      id: string;
      email: string;
      user_metadata: {
        role: string;
      };
    } | null;
    session: any;
  }
  
  export interface Profile {
    id: string;
    email: string;
    role: string;
    created_at: string;
  }