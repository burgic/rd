// src/components/Adviser/FileNoteComponent.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { ExtractedData } from '../../@types/fileNote';
import ExtractionPreviewComponent from './ExtractionPreviewComponent';

interface FileNote {
  id: string;
  client_id: string;
  adviser_id: string;
  content: string;
  created_at: string;
  summary?: string;
  extracted_data?: ExtractedData;
}

interface FileNoteComponentProps {
  clientId: string;
  onDataExtracted?: (extractedData: ExtractedData) => void;
}

const FileNoteComponent: React.FC<FileNoteComponentProps> = ({ clientId, onDataExtracted }) => {
  const [notes, setNotes] = useState<FileNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [expandedSummary, setExpandedSummary] = useState<boolean>(false);
  const [clientSummary, setClientSummary] = useState<string | null>(null);
  

  // Fetch existing notes
  useEffect(() => {
    const fetchNotes = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('file_notes')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNotes(data || []);

        // Get client summary if available
        const { data: summaryData, error: summaryError } = await supabase
          .from('client_summaries')
          .select('summary')
          .eq('client_id', clientId)
          .single();

        if (!summaryError && summaryData) {
          setClientSummary(summaryData.summary);
        }
      } catch (error) {
        console.error('Error fetching notes:', error);
        setError('Failed to load file notes');
      } finally {
        setIsLoading(false);
      }
    };

    if (clientId) {
      fetchNotes();
    }
  }, [clientId]);

  const addNote = async () => {
    if (!newNote.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Insert the new note
      const { data, error } = await supabase
        .from('file_notes')
        .insert({
          client_id: clientId,
          adviser_id: user.id,
          content: newNote,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;

      // Update local state
      if (data && data.length > 0) {
        setNotes(prev => [data[0], ...prev]);
        setNewNote('');
        setIsAdding(false);
      }
    } catch (error) {
      console.error('Error adding note:', error);
      setError('Failed to add file note');
    } finally {
      setIsLoading(false);
    }
  };

  const [extractionPreview, setExtractionPreview] = useState<{
    noteId: string;
    extractedData: any;
    summary: string;
  } | null>(null);

  const parseNote = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    setIsParsing(true);
    setError(null);

    try {
      // Call serverless function to parse note
      const response = await fetch('/.netlify/functions/parse-file-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          noteContent: note.content,
          clientId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to parse note');
      }

      const { extractedData, summary } = await response.json();

      // Show the preview instead of updating immediately
      setExtractionPreview({
        noteId,
        extractedData,
        summary
      });
    } catch (error) {
      console.error('Error parsing note:', error);
      setError('Failed to parse file note');
    } finally {
      setIsParsing(false);
    }
  };

  const confirmExtraction = async () => {
    if (!extractionPreview) return;
    
    const { noteId, extractedData, summary } = extractionPreview;
    
    try {
      // Show loading state
      setIsParsing(true);
      
      // Update note with extracted data and summary
      const { error: updateError } = await supabase
        .from('file_notes')
        .update({
          extracted_data: extractedData,
          summary: summary
        })
        .eq('id', noteId);

      if (updateError) throw updateError;

      // Update or create client summary
      const { error: summaryError } = await supabase
        .from('client_summaries')
        .upsert({
          client_id: clientId,
          summary: summary,
          updated_at: new Date().toISOString()
        });

      if (summaryError) throw summaryError;

      // Update local state
      setNotes(prevNotes => 
        prevNotes.map(n => 
          n.id === noteId 
            ? { ...n, extracted_data: extractedData, summary } 
            : n
        )
      );
      
      setClientSummary(summary);

      // Notify parent component about extracted data
      if (onDataExtracted) {
        // Use setTimeout to allow UI to update first before potentially heavy processing
        setTimeout(() => {
          onDataExtracted(extractedData);
        }, 0);
      }

      // Clear the preview
      setExtractionPreview(null);
    } catch (error) {
      console.error('Error updating with extracted data:', error);
      setError('Failed to update with extracted data');
    } finally {
      setIsParsing(false);
    }
  };

  const cancelExtraction = () => {
    setExtractionPreview(null);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">File Notes</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Note
          </button>
        )}
      </div>

      {/* Client Summary Section */}
      {clientSummary && (
        <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-blue-800">Client Summary</h3>
            <button
              onClick={() => setExpandedSummary(!expandedSummary)}
              className="text-blue-600 hover:text-blue-800"
            >
              {expandedSummary ? 'Collapse' : 'Expand'}
            </button>
          </div>
          {expandedSummary ? (
            <div className="text-sm text-gray-700">{clientSummary}</div>
          ) : (
            <div className="text-sm text-gray-700 line-clamp-2">{clientSummary}</div>
          )}
        </div>
      )}

      {/* Data Extraction Preview */}
      {extractionPreview && (
        <ExtractionPreviewComponent
          extractedData={extractionPreview.extractedData}
          summary={extractionPreview.summary}
          onConfirm={(updatedData, updatedSummary) => {
            // Update the extraction preview with edited data before confirming
            setExtractionPreview({
              ...extractionPreview,
              extractedData: updatedData,
              summary: updatedSummary
            });
            confirmExtraction();
          }}
          onCancel={cancelExtraction}
        />
      )}

      {/* Error messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* Add new note form */}
      {isAdding && (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">New File Note</h3>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[200px]"
            placeholder="Enter meeting notes, client goals, details about assets, liabilities, dependents, etc."
          />
          <div className="flex justify-end mt-3 space-x-3">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={addNote}
              disabled={isLoading || !newNote.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>
      )}

      {/* List of existing notes */}
      <div className="space-y-4">
        {notes.length === 0 && !isLoading ? (
          <p className="text-gray-500 text-center py-8">No file notes yet</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{formatDate(note.created_at)}</p>
                </div>
                <div className="flex space-x-2">
                  {!note.extracted_data && (
                    <button
                      onClick={() => parseNote(note.id)}
                      disabled={isParsing}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {isParsing ? 'Extracting...' : 'Extract Data'}
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                    className="px-3 py-1 bg-gray-200 text-sm rounded hover:bg-gray-300"
                  >
                    {expandedNoteId === note.id ? 'Collapse' : 'Expand'}
                  </button>
                </div>
              </div>
              
              {/* Note content */}
              {expandedNoteId === note.id && (
                <div className="p-4 border-t">
                  <div className="prose max-w-none">
                    {note.content.split('\n').map((paragraph, idx) => (
                      <p key={idx} className="mb-2">{paragraph}</p>
                    ))}
                  </div>
                  
                  {/* Show extracted data if available */}
                  {note.extracted_data && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium mb-2">Extracted Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(note.extracted_data).map(([key, value]) => (
                          <div key={key} className="bg-gray-50 p-2 rounded">
                            <span className="font-medium">{key}: </span>
                            <span>{JSON.stringify(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show summary if available */}
                  {note.summary && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium mb-2">Summary</h4>
                      <p className="text-gray-700">{note.summary}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FileNoteComponent;