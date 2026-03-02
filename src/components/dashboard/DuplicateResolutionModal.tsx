import React, { useState } from "react";
import { X, FileText, AlertTriangle, Check, RefreshCw } from "lucide-react";

interface DuplicateResolutionModalProps {
  isOpen: boolean;
  newFile: File | null;
  existingContract: any | null;
  onSkip: () => void;
  onReplace: () => Promise<void>;
}

export function DuplicateResolutionModal({
  isOpen,
  newFile,
  existingContract,
  onSkip,
  onReplace,
}: DuplicateResolutionModalProps) {
  const [isReplacing, setIsReplacing] = useState(false);

  const newFileUrl = React.useMemo(() => {
    if (!newFile) return null;
    return URL.createObjectURL(newFile);
  }, [newFile]);

  // Clean up object URL when closed or new file changes
  React.useEffect(() => {
    return () => {
      if (newFileUrl) {
        URL.revokeObjectURL(newFileUrl);
      }
    };
  }, [newFileUrl]);

  if (!isOpen || !newFile || !existingContract) return null;

  const handleReplaceClick = async () => {
    setIsReplacing(true);
    try {
      await onReplace();
      // Modal is closed by parent on success
    } catch (error) {
      console.error("Error during replacement:", error);
      alert("Failed to replace document.");
    } finally {
      setIsReplacing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-6xl h-[85vh] overflow-hidden border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <AlertTriangle size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-amber-900 text-lg">
                Duplicate Document Detected
              </h3>
              <p className="text-sm font-medium text-amber-700">
                A contract named "
                {existingContract.contract_name || newFile.name}" already exists
                in the database.
              </p>
            </div>
          </div>
        </div>

        {/* Body - Side by Side view */}
        <div className="flex-1 flex flex-col md:flex-row bg-slate-100 p-4 gap-6 min-h-0">
          {/* Left Side - Existing */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-0">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Current DB Version
                </span>
                <span className="font-semibold text-slate-800 text-sm flex items-center gap-1">
                  <FileText size={14} className="text-blue-500" /> Existing
                  Contract
                </span>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-mono">
                  ID: {existingContract.id?.substring(0, 8)}...
                </div>
                <div className="text-[10px] text-slate-400">
                  Uploaded:{" "}
                  {new Date(existingContract.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex-1 bg-slate-100">
              {existingContract.document_url ? (
                <iframe
                  src={`${existingContract.document_url}#toolbar=0`}
                  className="w-full h-full border-none"
                  title="Existing Document PDF"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm flex-col gap-2">
                  <FileText size={48} className="text-slate-200" />
                  No preview available for existing record.
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:flex flex-col justify-center items-center -mx-3 z-10">
            <div className="bg-white border text-slate-400 border-slate-200 rounded-full p-2 shadow-sm font-black text-xs">
              VS
            </div>
          </div>

          {/* Right Side - New Upload */}
          <div className="flex-1 bg-white rounded-xl border border-blue-200 shadow-sm flex flex-col overflow-hidden min-h-0 ring-4 ring-blue-50">
            <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  New Upload
                </span>
                <span className="font-semibold text-blue-900 text-sm flex items-center gap-1">
                  <FileText size={14} className="text-blue-500" />{" "}
                  {newFile.name}
                </span>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-blue-400 font-mono">
                  Size: {(newFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
                <div className="text-[10px] text-blue-400">
                  Type: {newFile.type}
                </div>
              </div>
            </div>
            <div className="flex-1 bg-slate-100">
              <iframe
                src={`${newFileUrl}#toolbar=0`}
                className="w-full h-full border-none"
                title="New Document PDF"
              />
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="bg-white border-t border-slate-200 p-4 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onSkip}
            disabled={isReplacing}
            className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
          >
            Skip Upload
          </button>
          <button
            onClick={handleReplaceClick}
            disabled={isReplacing}
            className="px-6 py-2.5 bg-blue-600 border border-blue-700 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2 min-w-[140px]"
          >
            {isReplacing ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Replacing...
              </>
            ) : (
              <>
                <Check size={16} /> Replace Existing
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
