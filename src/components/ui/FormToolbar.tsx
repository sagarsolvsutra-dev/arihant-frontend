import React from "react";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface FormToolbarProps {
  title: string;
  onSave: (e?: React.FormEvent) => void;
  onCancel: () => void;
  saving?: boolean;
  isSaving?: boolean;
  onClose?: () => void;
}

export function FormToolbar({
  title,
  onSave,
  onCancel,
  saving = false,
  isSaving = false,
  onClose,
}: FormToolbarProps) {
  const finalSaving = saving || isSaving;
  const finalCancel = onCancel || onClose;
  
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm z-10 shrink-0 sticky top-0 flex justify-between items-center px-6 py-3">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        {finalCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={finalCancel}
            disabled={finalSaving}
            leftIcon={<X size={16} />}
          >
            Cancel
          </Button>
        )}
        <Button 
          type="button" 
          variant="primary" 
          onClick={onSave}
          isLoading={finalSaving}
          leftIcon={<Save size={16} />}
        >
          {finalSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
