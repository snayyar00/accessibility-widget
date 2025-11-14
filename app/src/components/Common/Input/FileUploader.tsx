import React from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';
import { toast } from 'sonner';import cn from 'classnames';
import { Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export type IFile = {
  url?: string;
  uuid?: string;
  file?: File | null;
};

type Props = {
  value: IFile[];
  maxFiles?: number;
  acceptedExt?: string[];
  maxFileSize?: number;
  disabled?: boolean;
  onChange: (files: IFile[]) => void;
};

export default function FileUploader({
  value = [],
  onChange,
  acceptedExt = ['.jpg', '.jpeg', '.png', '.svg'],
  maxFileSize = 2e6, // 10 Mb
  maxFiles = 1, // 0 - no limit on the number of files
  disabled = false,
}: Props) {
  const customErrors: {
    [key: string]: string;
  } = {
    'too-many-files': 'Too many files. Please upload fewer files.',
    'file-invalid-type':
      'Invalid file type. Please upload an accepted file format.',
    'file-too-large': 'File is too large. Please upload a smaller file.',
    unexpected: 'Unexpected error occurred. Please try again.',
  };

  function unsubscribe(url: string | undefined): void {
    if (url) URL.revokeObjectURL(url); // avoiding memory leaks
  }

  function onAccepted<T extends File>(acceptedFiles: T[]) {
    if (maxFiles !== 0 && maxFiles !== 1 && value.length >= maxFiles) {
      toast.error(customErrors['too-many-files']);

      return;
    }

    const newFiles = [...value];

    Object.values(acceptedFiles).forEach((file) => {
      const fileUrl = URL.createObjectURL(file);

      newFiles.push({
        url: fileUrl,
        file,
        uuid: '',
      });
    });

    if (maxFiles === 1)
      return onChange(newFiles.length === 2 ? [newFiles[1]] : newFiles);

    onChange(newFiles);
  }

  function onRejected(innerFiles: FileRejection[]) {
    const firstFileErrorFirstCode = innerFiles[0].errors[0].code;

    toast.error(
      customErrors[firstFileErrorFirstCode] || customErrors.unexpected,
    );
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': acceptedExt,
    },

    maxFiles,
    maxSize: maxFileSize,

    onDropAccepted: (acceptedFiles) => onAccepted(acceptedFiles),
    onDropRejected: (rejectedFiles) => onRejected(rejectedFiles),
  });

  function handleRemove(e: React.SyntheticEvent, url: string | undefined) {
    e.preventDefault();
    unsubscribe(url);

    const filteredFiles = value.filter((item) => item.url !== url);

    onChange(filteredFiles);
  }

  return (
    <div>
      <div
        className={cn(
          'flex min-h-[112px] items-center justify-center rounded-[4px] border border-dashed border-[#D0D0D0] bg-white p-5 outline-none transition-all',
          {
            'border-[#212121FF]': isDragActive,
          },
        )}
        {...getRootProps()}
      >
        <input {...getInputProps()} />

        <div className="-m-3 mx-auto flex flex-wrap items-center justify-center">
          <div className="max-w-[240px] p-3 text-center text-xs text-[#00000099]">
            <span>Upload Files</span>
          </div>

          <div className="p-3">
            <Button
              size="large"
              disabled={disabled}
              variant="outlined"
              color="primary"
              type="button"
            >
              Upload File
            </Button>
          </div>

          <div className="p-3 text-center text-xs text-[#00000099]">
            <span>
              {acceptedExt.map((item) => item.substring(1)).join(', ')}
            </span>
          </div>
        </div>
      </div>

      {!!value.length && (
        <div className="-m-1 flex flex-wrap pt-3 only:pt-2">
          {value.map((file) => (
            <div className="p-1" key={file.url}>
              <div className="relative w-[64px] h-[64px] lg:w-[128px] lg:h-[128px] overflow-hidden rounded-[4px] border border-[#D0D0D0] border-dashed">
                <img
                  className="w-full h-full object-contain p-2"
                  src={file.url}
                  alt={`image-${file.uuid}`}
                />

                {!disabled && (
                  <a
                    className="absolute right-0 top-0 flex w-[24px] h-[24px] items-center justify-center text-[#00000099] transition-colors hover:text-red-500 active:text-[#00000099]"
                    href="#"
                    onClick={(e) => handleRemove(e, file.url)}
                  >
                    <CloseIcon fontSize="small" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
