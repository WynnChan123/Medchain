"use client";

import React, { useState } from 'react';
import { Upload, FileText, Image, File, X } from 'lucide-react';

const UploadPage = () => {
  const [uploadedFiles, setUploadedFiles] = useState([
    { id: 1, name: 'Document1.docx', size: '2.3 MB', type: 'docx' },
    { id: 2, name: 'Subdivision.xlsx', size: '1.8 MB', type: 'xlsx' },
    { id: 3, name: 'Projects.txt.txt', size: '945 KB', type: 'txt' },
    { id: 4, name: 'download.json', size: '1.2 MB', type: 'json' }
  ]);
  const [dragActive, setDragActive] = useState(false);

  // DRAG AND DROP LOGIC EXPLANATION:
  // Step 1: handleDrag - Detects when user drags files over the drop zone
  // - "dragenter" & "dragover": User is dragging over the zone → highlight it
  // - "dragleave": User dragged away from the zone → remove highlight
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevents browser from opening the file
    e.stopPropagation(); // Stops event from bubbling up
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true); // Highlight the drop zone
    } else if (e.type === "dragleave") {
      setDragActive(false); // Remove highlight
    }
  };

  // Step 2: handleDrop - Fires when user releases (drops) the files
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevents browser default behavior
    e.stopPropagation();
    setDragActive(false); // Remove highlight after drop
    
    // e.dataTransfer.files contains the dropped files
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files); // Process the files
    }
  };

  // Step 3: handleFileInput - Handles files selected via Browse button
  const handleFileInput = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files); // Process the files same way
    }
  };

  // Step 4: handleFiles - Central function that processes files
  // Converts FileList to array, creates file objects, adds to state
  const handleFiles = (files: FileList) => {
    const newFiles = Array.from(files).map((file, index) => ({
      id: Date.now() + index, // Unique ID for each file
      name: file.name,
      size: formatFileSize(file.size),
      type: file.name.split('.').pop() || 'unknown' // Get file extension with fallback
    }));
    setUploadedFiles([...uploadedFiles, ...newFiles]); // Add to existing files
  };

  const formatFileSize = (bytes: any) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const removeFile = (id: any) => {
    setUploadedFiles(uploadedFiles.filter(file => file.id !== id));
  };

  const getFileIcon = (type: any) => {
    if (type === 'docx' || type === 'doc') return <FileText className="w-5 h-5 text-blue-500" />;
    if (type === 'xlsx' || type === 'xls') return <FileText className="w-5 h-5 text-green-500" />;
    if (type === 'txt') return <FileText className="w-5 h-5 text-purple-500" />;
    if (type === 'json') return <FileText className="w-5 h-5 text-purple-500" />;
    if (type === 'png' || type === 'jpg' || type === 'jpeg') return <Image className="w-5 h-5 text-green-500" />;
    if (type == 'pdf') return <FileText className="w-5 h-5 text-red-600" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        {/* Changed to flex with gap */}
        <div className="flex flex-row gap-8">
          
          {/* Upload Area - Left Half using flex-1 */}
          <div className="flex-1">
            <h1 className="text-white font-bold text-3xl mb-2">Upload Files</h1>
            <p className="text-gray-400 mb-6">Upload documents you want to share</p>
            
            {/* Drop zone with event handlers */}
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-600 bg-gray-800'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                  <Upload className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-300 mb-6">Drag and drop files here</p>
                <input
                  type="file"
                  id="fileInput"
                  className="hidden"
                  multiple
                  onChange={handleFileInput}
                />
                <label htmlFor="fileInput">
                  <div className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded cursor-pointer transition-colors">
                    Browse Files
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Uploaded Files - Right Half using flex-1 */}
          <div className="flex-1">
            <h2 className="text-white font-bold text-xl mb-6">Uploaded Files</h2>
            <div className="bg-gray-800 rounded-lg p-6 space-y-3">
              {uploadedFiles.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No files uploaded yet</p>
              ) : (
                uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getFileIcon(file.type)}
                      <div>
                        <p className="text-white font-medium">{file.name}</p>
                        <p className="text-gray-400 text-sm">{file.size}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end p-6 max-w-7xl mx-auto">
        <button className="flex bg-blue-500 justify-end p-3 rounded-lg justify-items-end hover:bg-blue-600 text-white">Share Files</button>
      </div>
    </div>
  );
};

export default UploadPage;
