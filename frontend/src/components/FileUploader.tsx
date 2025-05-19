import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, X, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { validateCSV } from '../api/forecastApi';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, isUploading }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];

    if (!file) return;

    if (!validateCSV(file)) {
      setError('Please upload a valid CSV file');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleSubmit = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setError(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-8 transition-all duration-300">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Your Data</h2>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${isDragActive
            ? 'border-blue-500 bg-blue-50'
            : error
              ? 'border-red-300 bg-red-50'
              : selectedFile
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
      >
        <input {...getInputProps()} />

        {selectedFile ? (
          <div className="flex flex-col items-center">
            <CheckCircle className="text-green-500 mb-2" size={40} />
            <p className="text-lg font-medium text-gray-800">{selectedFile.name}</p>
            <p className="text-sm text-gray-500">
              {(selectedFile.size / 1024).toFixed(2)} KB
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center">
            <AlertCircle className="text-red-500 mb-2" size={40} />
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-sm text-gray-600 mt-2">Please try again with a CSV file</p>
          </div>
        ) : isDragActive ? (
          <div className="flex flex-col items-center">
            <Upload className="text-blue-500 mb-2" size={40} />
            <p className="text-blue-600 font-medium">Drop your CSV file here...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <FileUp className="text-gray-400 mb-2" size={40} />
            <p className="text-lg font-medium text-gray-700">
              Drag & drop your CSV file here
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to browse files
            </p>
            <p className="text-xs text-gray-400 mt-4 max-w-md">
              Your file should contain at least two columns: 'Date' and 'Amount'
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-4">
        {selectedFile ? (
          <>
            <button
              onClick={handleClear}
              className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              disabled={isUploading}
            >
              <X size={16} className="mr-2" />
              Clear
            </button>

            <button
              onClick={handleSubmit}
              disabled={isUploading}
              className={`flex items-center px-6 py-2 text-white rounded transition-colors ${isUploading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <Upload size={16} className="mr-2" />
                  Generate Forecast
                </>
              )}
            </button>
          </>
        ) : (
          <div></div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;