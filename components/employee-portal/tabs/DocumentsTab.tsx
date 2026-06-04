import React, { useState, useRef, useCallback } from 'react';
import { FileText, ImageIcon } from 'lucide-react';
import type { UserProfile } from '../../../types';
import { PROFILE_GLASS_CARD_BASE } from '../../../utils/themeStyles';

const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > 500 * 1024) {
      reject(new Error('File too large (max 500KB)'));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

interface DocCardProps {
  title: string;
  image: string | undefined;
  onUpload?: (file: File) => void;
  onRemove?: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  loading?: boolean;
  deleting?: boolean;
  t: any;
}

const DocCard: React.FC<DocCardProps> = ({ title, image, onUpload, onRemove, isExpanded, onToggleExpand, loading, deleting, t }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`${PROFILE_GLASS_CARD_BASE} p-3`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {image && !isExpanded ? (
            <div className="min-w-0 max-w-14 shrink-0">
              <img src={image} alt="" className="w-full h-auto max-h-9 rounded ring-1 ring-(--border-divider) object-contain bg-(--bg-secondary)" />
            </div>
          ) : (
            <ImageIcon className="w-4 h-4 text-primary-500 shrink-0" />
          )}
          <span className="text-xs font-bold text-(--text-primary) truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {image && (
            <button onClick={onToggleExpand} className="p-1 text-(--text-tertiary) hover:text-primary-500 transition-colors" type='button'>
              <span className="material-symbols-rounded text-[16px]">{isExpanded ? 'close_fullscreen' : 'open_in_full'}</span>
            </button>
          )}
          {!image && onUpload && (
            <>
              <button onClick={() => inputRef.current?.click()} className="p-1 text-(--text-tertiary) hover:text-primary-500 transition-colors" type='button' disabled={loading}>
                {loading ? (
                  <span className="w-[16px] h-[16px] border-2 border-(--text-tertiary)/30 border-t-(--text-tertiary) rounded-full animate-spin block" />
                ) : (
                  <span className="material-symbols-rounded text-[16px]">upload</span>
                )}
              </button>
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            </>
          )}
          {image && onRemove && (
            <button onClick={onRemove} className="p-1 text-(--text-tertiary) hover:text-red-500 transition-colors" type='button' disabled={deleting}>
              {deleting ? (
                <span className="w-[16px] h-[16px] border-2 border-(--text-tertiary)/30 border-t-(--text-tertiary) rounded-full animate-spin block" />
              ) : (
                <span className="material-symbols-rounded text-[16px]">delete</span>
              )}
            </button>
          )}
          {!image && onUpload && (
            <span className="text-[10px] text-(--text-tertiary) font-medium">{t.employeeProfile.noFile}</span>
          )}
        </div>
      </div>
      {isExpanded && image && (
        <div className="mt-3 rounded-xl overflow-hidden border border-(--border-color)">
          <img src={image} alt={title} className="w-full object-cover" />
        </div>
      )}
    </div>
  );
};

interface DocumentsTabProps {
  profile: UserProfile | null;
  t: any;
  onUpdateProfile?: (updates: Partial<UserProfile>) => Promise<void>;
}

type DocField = 'nationalIdCard' | 'nationalIdCardBack' | 'mainSyndicateCard' | 'subSyndicateCard';

const DOC_FIELDS: { field: DocField; labelKey: string }[] = [
  { field: 'nationalIdCard', labelKey: 'nationalIdFront' },
  { field: 'nationalIdCardBack', labelKey: 'nationalIdBack' },
  { field: 'mainSyndicateCard', labelKey: 'syndicateCard' },
  { field: 'subSyndicateCard', labelKey: 'subSyndicateCard' }
];

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ profile, t, onUpdateProfile }) => {
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);

  const toggleExpanded = useCallback((field: string) => {
    setExpandedDocs(prev => {
      const n = new Set(prev);
      n.has(field) ? n.delete(field) : n.add(field);
      return n;
    });
  }, []);

  const handleDocUpload = useCallback(async (field: DocField, file: File) => {
    if (!onUpdateProfile) return;
    setUploadingDoc(field);
    try {
      const base64 = await readFileAsBase64(file);
      await onUpdateProfile({ [field]: base64 } as Partial<UserProfile>);
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setUploadingDoc(null);
    }
  }, [onUpdateProfile]);

  const handleDocRemove = useCallback(async (field: DocField) => {
    if (!onUpdateProfile) return;
    setDeletingDoc(field);
    try {
      await onUpdateProfile({ [field]: null } as unknown as Partial<UserProfile>);
    } finally {
      setDeletingDoc(null);
    }
  }, [onUpdateProfile]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-primary-500 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          {t.employeeProfile.officialDocuments}
        </h4>

        {DOC_FIELDS.map(({ field, labelKey }) => (
          <DocCard
            key={field}
            title={t.employeeProfile[labelKey]}
            image={profile?.[field]}
            onUpload={onUpdateProfile ? (file) => handleDocUpload(field, file) : undefined}
            onRemove={onUpdateProfile ? () => handleDocRemove(field) : undefined}
            isExpanded={expandedDocs.has(field)}
            onToggleExpand={() => toggleExpanded(field)}
            loading={uploadingDoc === field}
            deleting={deletingDoc === field}
            t={t}
          />
        ))}
      </div>
    </div>
  );
};
