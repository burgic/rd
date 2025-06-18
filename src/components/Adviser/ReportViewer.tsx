import React from 'react';

interface ReportViewerProps {
  content: string;
  onDownload?: () => void;
}

const ReportViewer = ({ content, onDownload }: ReportViewerProps) => {
  // Parse sections from the content
  // Assuming sections are marked with ## for headers
  const sections = content.split('\n').reduce((acc, line) => {
    if (line.startsWith('##')) {
      acc.push({ title: line.replace('##', '').trim(), content: [] });
    } else if (acc.length > 0) {
      acc[acc.length - 1].content.push(line);
    } else {
      // Content before first section goes into an "Overview" section
      acc.push({ title: 'Overview', content: [line] });
    }
    return acc;
  }, [] as { title: string; content: string[] }[]);

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-900">Suitability Report</h2>
          {onDownload && (
            <button
              onClick={onDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Download PDF
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Generated on {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Table of Contents */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium mb-4">Contents</h3>
        <nav className="space-y-1">
          {sections.map((section, index) => (
            <a
              key={index}
              href={`#section-${index}`}
              className="text-blue-600 hover:text-blue-800 block"
            >
              {section.title}
            </a>
          ))}
        </nav>
      </div>

      {/* Report Content */}
      <div className="p-6">
        {sections.map((section, index) => (
          <section
            key={index}
            id={`section-${index}`}
            className="mb-8 scroll-mt-6"
          >
            <h3 className="text-xl font-semibold mb-4 text-gray-900">
              {section.title}
            </h3>
            <div className="prose max-w-none">
              {section.content.map((paragraph, pIndex) => (
                <p
                  key={pIndex}
                  className="mb-4 text-gray-700 leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-6">
        <p className="text-sm text-gray-500">
          This report is generated based on the information provided and should be reviewed with your financial adviser.
        </p>
      </div>
    </div>
  );
};

export default ReportViewer;