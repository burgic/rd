// src/migrations/migrateTo_v2_addFileNotes.ts
import { supabase } from '../services/supabaseClient';

/**
 * Run this migration to add the file_notes and client_summaries tables
 * to your existing database.
 */
export const migrateToV2AddFileNotes = async () => {
  console.log('Starting migration to add file_notes and client_summaries tables...');
  
  try {
    // Check if the tables already exist
    const { data: tablesData, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .in('tablename', ['file_notes', 'client_summaries']);
    
    if (tablesError) {
      console.error('Error checking existing tables:', tablesError);
      return { success: false, message: 'Error checking existing tables' };
    }
    
    const existingTables = tablesData.map(t => t.tablename);
    
    // Create file_notes table if it doesn't exist
    if (!existingTables.includes('file_notes')) {
      const { error: createNotesError } = await supabase.rpc('create_file_notes_table');
      
      if (createNotesError) {
        console.error('Error creating file_notes table:', createNotesError);
        return { success: false, message: 'Error creating file_notes table' };
      }
      
      console.log('Created file_notes table successfully');
    } else {
      console.log('file_notes table already exists, skipping creation');
    }
    
    // Create client_summaries table if it doesn't exist
    if (!existingTables.includes('client_summaries')) {
      const { error: createSummariesError } = await supabase.rpc('create_client_summaries_table');
      
      if (createSummariesError) {
        console.error('Error creating client_summaries table:', createSummariesError);
        return { success: false, message: 'Error creating client_summaries table' };
      }
      
      console.log('Created client_summaries table successfully');
    } else {
      console.log('client_summaries table already exists, skipping creation');
    }
    
    return { success: true, message: 'Migration completed successfully' };
  } catch (error) {
    console.error('Migration failed:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown migration error' 
    };
  }
};

// This helps to run the migration from the browser console or a script
export const runMigration = async () => {
  const result = await migrateToV2AddFileNotes();
  console.log('Migration result:', result);
  return result;
};