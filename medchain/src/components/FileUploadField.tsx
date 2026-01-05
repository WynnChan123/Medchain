import { X } from 'lucide-react';
import React from 'react';

interface FileUploadFieldProps {
  label: string;
  file: File | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
  label,
  file,
  onChange,
  onRemove,
}) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <label className="text-white text-sm mb-2 block">{label}</label>
      <div className="flex items-center gap-3">
        <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer text-sm">
          Choose File
          <input type="file" onChange={onChange} className="hidden" />
        </label>
        <span className="text-gray-400 text-sm flex-1">
          {file ? file.name : 'No file chosen'}
        </span>
        {file && (
          <button 
            type="button"
            className="text-red-400 hover:text-red-300 transition-colors"
            onClick={onRemove}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FileUploadField;
