"use client";

import React, { useState, useRef } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { importPollFromJson } from "../../utils/poll-utils";
import { saveCreatedPoll, getCreatedPollById } from "../../utils/localStorage";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

/**
 * Status of the import operation
 */
type ImportStatus = "idle" | "success" | "error";

/**
 * ImportPollForm component props
 */
interface ImportPollFormProps {
  onSuccess?: () => void;
}

/**
 * ImportPollForm component for importing polls from JSON files
 * @param onSuccess - Optional callback to run when import is successful
 */
export function ImportPollForm({ onSuccess }: ImportPollFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);

  /**
   * Handle file selection
   * @param event - File input change event
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      setStatusMessage("No file selected");
      setImportStatus("error");
      return;
    }
    
    // Reset status
    setImportStatus("idle");
    setStatusMessage("");
    setIsImporting(true);
    
    // Read file as text
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const jsonContent = e.target?.result as string;
        const importedPoll = importPollFromJson(jsonContent);
        
        // Check if poll already exists
        const existingPoll = getCreatedPollById(importedPoll.id);
        
        // Save the poll
        saveCreatedPoll(importedPoll);
        
        // Set success message
        setImportStatus("success");
        setStatusMessage(existingPoll 
          ? `Poll "${importedPoll.question}" updated successfully` 
          : `Poll "${importedPoll.question}" imported successfully`);
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        setImportStatus("error");
        setStatusMessage((error as Error).message || "Failed to import poll");
      } finally {
        setIsImporting(false);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    
    reader.onerror = () => {
      setImportStatus("error");
      setStatusMessage("Failed to read file");
      setIsImporting(false);
    };
    
    reader.readAsText(file);
  };

  /**
   * Trigger file input click
   */
  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Import Poll</CardTitle>
        <CardDescription>
          Import a poll from a JSON file that was previously exported
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center justify-center gap-6 p-6">
        <input
          type="file"
          ref={fileInputRef}
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div 
          className="w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          onClick={handleSelectFileClick}
        >
          <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
          <p className="text-gray-600 dark:text-gray-400">
            Click to select a JSON file
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Only .json files are supported
          </p>
        </div>
        
        {importStatus !== "idle" && (
          <div className={`w-full p-4 rounded-lg flex items-center gap-2 ${
            importStatus === "success" 
              ? "bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-300" 
              : "bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-300"
          }`}>
            {importStatus === "success" ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="px-6 pb-6 pt-0">
        <Button
          fullWidth
          onClick={handleSelectFileClick}
          isLoading={isImporting}
          variant="primary"
        >
          {isImporting ? "Importing..." : "Select Poll File"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default ImportPollForm; 