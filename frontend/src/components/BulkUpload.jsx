import { useState } from 'react';
import { FaUpload, FaFileCsv, FaTimes, FaDownload } from 'react-icons/fa';

const BulkUpload = ({ onUpload, entityName, endpoint, token, departmentId = '', classId = '', compact = false, disabled = false }) => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
    } else {
      setMessage({ text: 'Please upload a valid CSV file', type: 'error' });
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setMessage({ text: '', type: '' });
    } else {
      setMessage({ text: 'Please select a valid CSV file', type: 'error' });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ text: 'Please select a file first', type: 'error' });
      return;
    }

    // Only require department/class for students
    if (entityName === 'student' && !departmentId) {
      setMessage({ text: 'Please select a class first', type: 'error' });
      return;
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Only include departmentId and classId for students
    if (entityName === 'student') {
      if (departmentId) formData.append('departmentId', departmentId);
      if (classId) formData.append('classId', classId);
    }
    
    // Log FormData contents for debugging
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(key, value);
    }

    setIsUploading(true);
    setMessage({ text: 'Uploading...', type: 'info' });

    try {
      // Determine the correct endpoint based on entity type
      const endpoint = entityName === 'student' 
        ? 'http://localhost:5000/api/students/bulk-upload'
        : 'http://localhost:5000/api/teachers/bulk-upload';
      
      console.log('Sending request to:', endpoint);
      
      // Create headers
      const headers = {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type - let the browser set it with the correct boundary
      };
      
      console.log('Request headers:', headers);
      
      // Make the request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
      
      // Get response text first
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        console.error('Response that failed to parse:', responseText);
        throw new Error(`Invalid response from server (${response.status} ${response.statusText}). Please try again.`);
      }
      
      console.log('Parsed response data:', data);

      if (response.ok) {
        console.log('Received successful response:', data);
        
        // More robust error detection
        const hasErrors = data && data.status === 'error';
        const hasDataErrors = data && data.data && data.data.errors && data.data.errors.length > 0;
        const hasTopLevelErrors = data && data.errors && data.errors.length > 0;
        
        console.log('Has errors:', hasErrors);
        console.log('Has data errors:', hasDataErrors);
        console.log('Has top level errors:', hasTopLevelErrors);
        console.log('Data status:', data?.status);
        console.log('Data data errors:', data?.data?.errors);
        
        if (hasErrors || hasDataErrors || hasTopLevelErrors) {
          // Format error messages for better display
          // Handle both teacher and student error structures
          const errorSource = data.errors || (data.data && data.data.errors) || [];
          
          console.log('Error source:', errorSource);
          
          // Simplified error message formatting
          let errorMessages = '';
          if (errorSource.length > 0) {
            // For students, the errors are in data.data.errors as strings
            errorMessages = errorSource.map(error => {
              if (typeof error === 'string') {
                return error;
              } else if (typeof error === 'object' && error !== null) {
                if (error.message) {
                  return error.message;
                } else {
                  return JSON.stringify(error);
                }
              } else {
                return String(error);
              }
            }).join('\n\n');
          } else if (data.data && data.data.duplicates && data.data.duplicates > 0) {
            errorMessages = `Found ${data.data.duplicates} duplicate student(s)`;
          }
          
          console.log('Formatted error messages:', errorMessages);
          
          const errorCount = errorSource.length || data.data?.duplicates || data.errorCount || 0;
          setMessage({ 
            text: errorCount > 0 
              ? `Upload completed with ${errorCount} error(s):\n${errorMessages}`
              : 'Upload completed with errors',
            type: 'error' 
          });
        } else {
          console.log('No errors detected, showing success message');
          const createdCount = data.data?.created?.length || data.addedCount || 0;
          const messageText = createdCount > 0 
            ? `Successfully uploaded ${createdCount} ${entityName}(s).` 
            : 'Upload completed with no new records added.';
          setMessage({ 
            text: messageText,
            type: 'success' 
          });
        }
        if (onUpload) onUpload();
        setFile(null);
        document.getElementById(`file-upload-${entityName}`).value = '';
      } else {
        throw new Error(data.message || `Upload failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = error.message || 'An error occurred during upload';
      
      // Handle specific error cases
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to the server. Please check your connection.';
      } else if (error.message.includes('NetworkError')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('Unexpected token')) {
        errorMessage = 'Invalid server response. The server might be experiencing issues.';
      }
      
      setMessage({ 
        text: errorMessage, 
        type: 'error' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    document.getElementById(`file-upload-${entityName}`).value = '';
    setMessage({ text: '', type: '' });
  };

  const downloadTemplate = () => {
    let csvContent = '';
    
    if (entityName === 'student') {
      csvContent = 'name,email,phoneNo,userId,password\n' +
                  'John Doe,john@example.com,1234567890,ST001,Student@123\n' +
                  'Jane Smith,jane@example.com,9876543210,ST002,Student@123';
    } else if (entityName === 'teacher') {
      csvContent = 'name,email,phoneNumber,userId,password\n' +
                  'John Teacher,john.t@example.com,1234567890,T001,Teacher@123\n' +
                  'Jane Teacher,jane.t@example.com,9876543210,T002,Teacher@123';
    } else {
      csvContent = 'name,email,phone,userId,password\n' +
                  'Example User,user@example.com,1234567890,ID001,password123';
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${entityName}_template.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (compact) {
    return (
      <div className="relative group">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => document.getElementById(`file-upload-${entityName}`)?.click()}
            className="text-black dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center text-sm"
            title={`Upload ${entityName}s via CSV`}
          >
            <FaUpload className="mr-1.5 text-black" size={14} />
            <span className="hidden sm:inline text-black">Bulk Upload</span>
            <input
              id={`file-upload-${entityName}`}
              type="file"
              className="sr-only"
              accept=".csv"
              onChange={handleFileChange}
            />
          </button>
          <span className="text-gray-400">|</span>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            title="Download CSV template"
          >
            <FaDownload className="mr-1.5" size={12} />
            <span className="hidden sm:inline">Template</span>
          </button>
        </div>
        
        {file && (
          <div className="absolute z-10 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center truncate">
                <FaFileCsv className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                <span className="text-sm font-medium text-black dark:text-gray-200 truncate">
                  {file.name}
                </span>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="text-gray-400 hover:text-gray-500"
                disabled={isUploading}
              >
                <FaTimes className="h-3 w-3" />
              </button>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {(file.size / 1024).toFixed(1)} KB
              </span>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className={`text-xs px-2 py-1 rounded ${
                  isUploading
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
            {message.text && (
              <div className={`mt-2 text-xs p-2 rounded ${
                message.type === 'error' 
                  ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              }`}>
                {message.text}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
          Bulk Upload {entityName}s
        </h3>
        <button
          onClick={downloadTemplate}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          type="button"
        >
          <FaDownload className="mr-1" size={12} />
          Download Template
        </button>
      </div>
      
      <div 
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          <FaFileCsv className="h-10 w-10 text-gray-400" />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <label 
              htmlFor={`file-upload-${entityName}`} 
              className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
            >
              <span>Upload a CSV file</span>
              <input 
                id={`file-upload-${entityName}`}
                name="file-upload" 
                type="file" 
                className="sr-only" 
                accept=".csv"
                onChange={handleFileChange}
              />
            </label>
            <p className="pl-1 inline">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            CSV up to 10MB
          </p>
        </div>
      </div>

      {file && (
        <div className="mt-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-md p-3">
          <div className="flex items-center">
            <FaFileCsv className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-black dark:text-gray-200">
              {file.name}
            </span>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
          <button
            type="button"
            onClick={removeFile}
            className="text-gray-400 hover:text-gray-500"
            disabled={isUploading}
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>
      )}

      {message.text && (
        <div 
          className={`mt-3 p-3 rounded-md ${
            message.type === 'error' 
              ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
              : message.type === 'success'
                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          }`}
        >
          {message.text}
        </div>
      )}
      <div className="mt-4">
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || isUploading}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
            !file || isUploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {isUploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </>
          ) : (
            <>
              <FaUpload className="-ml-1 mr-2 h-4 w-4" />
              Upload {entityName}s
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default BulkUpload;
