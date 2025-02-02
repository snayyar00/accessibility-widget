import { CircularProgress } from "@mui/material";
import React, { useEffect } from "react";
import { GoAlertFill } from "react-icons/go";

interface ConfirmDeleteSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: number, status: string) => void;
  domainID: number;
  domainStatus: string;
  billingLoading: boolean;
}

const ConfirmDeleteSiteModal: React.FC<ConfirmDeleteSiteModalProps> = ({
  isOpen,
  onClose,
  onDelete,
  domainID,
  domainStatus,
  billingLoading,
}) => {
  useEffect(() => {
    if (isOpen) {
      // Add any side effects if needed when modal opens
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onClick={billingLoading ? undefined : onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md mx-4 border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Confirm Site Deletion</h2>
        
        <div className="bg-red-600 text-white p-4 rounded-md mb-6">
          <div className="flex items-center mb-2">
            <GoAlertFill className="w-6 h-6 mr-2" />
            <span className="font-semibold">Warning: Irreversible Action</span>
          </div>
          <p className="text-sm">
  Deleting this site is irreversible and cannot be undone.
  <br /><br />
  <strong>Important:</strong> Deleted sites will continue to count toward your subscription usage.
</p>

        </div>

        <p className="text-gray-700 mb-4">
        Click <strong>Cancel</strong> to return without making any changes.
        </p>

        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors duration-200"
            disabled={billingLoading}
          >
            Cancel
          </button>
          <button
            onClick={() => onDelete(domainID, domainStatus)}
            className="px-6 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 flex items-center"
            disabled={billingLoading}
          >
            {billingLoading ? (
              <>
                <CircularProgress className="-ml-1 mr-5" size={25} sx={{ color: 'white' }} />
                Processing...
              </>
            ) : (
              "Delete Site"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteSiteModal;

