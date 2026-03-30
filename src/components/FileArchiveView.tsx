'use client';

import { useState, useRef } from 'react';
import { supabase, FileArchive } from '@/lib/supabase';
import { Upload, FileImage, File, Trash2, Eye, X } from 'lucide-react';

interface FileArchiveViewProps {
  archives: FileArchive[];
  onUploaded: (file: FileArchive) => void;
  onDeleted: (id: string) => void;
}

export default function FileArchiveView({ archives, onUploaded, onDeleted }: FileArchiveViewProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewItem, setPreviewItem] = useState<FileArchive | null>(null);
  const [title, setTitle] = useState('');
  const [child, setChild] = useState<'jeum' | 'eum' | 'mom' | 'both' | 'all'>('all');
  const [description, setDescription] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !title.trim()) {
      alert('제목을 먼저 입력해주세요');
      return;
    }

    setIsUploading(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const isSupabaseReady = supabaseUrl && supabaseUrl !== 'your_supabase_project_url';

      let fileUrl = '';
      const fileType = file.type.includes('pdf') ? 'pdf' : 'image';

      if (isSupabaseReady) {
        const ext = file.name.split('.').pop();
        const path = `archives/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('mykid-files')
          .upload(path, file);

        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('mykid-files').getPublicUrl(path);
        fileUrl = data.publicUrl;

        const { data: record, error: dbError } = await supabase
          .from('file_archives')
          .insert({ child, title: title.trim(), file_url: fileUrl, file_type: fileType, description })
          .select()
          .single();

        if (dbError) throw dbError;
        onUploaded(record as FileArchive);
      } else {
        // 로컬 미리보기 URL
        fileUrl = URL.createObjectURL(file);
        const tempArchive: FileArchive = {
          id: `temp-${Date.now()}`,
          child,
          title: title.trim(),
          file_url: fileUrl,
          file_type: fileType,
          description,
          created_at: new Date().toISOString(),
        };
        onUploaded(tempArchive);
      }

      setTitle('');
      setDescription('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      console.error(err);
      alert('업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const CHILD_LABEL = { jeum: '열음', eum: '지음', mom: '엄마', both: '아이공통', all: '전체공통' };
  const CHILD_COLOR: Record<string, {bg: string, color: string}> = {
    jeum: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
    eum: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
    mom: { bg: 'rgba(168,85,247,0.15)', color: '#a855f7' },
    both: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
    all: { bg: 'rgba(107,114,128,0.15)', color: '#6b7280' },
  };


  return (
    <div className="space-y-4">
      {/* 업로드 폼 */}
      <div className="glass-card p-4">
        <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
          📁 파일 업로드
        </h3>
        <div className="space-y-3">
          <input
            id="archive-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="파일 제목 (예: 3월 학원 시간표)"
            className="input-field"
          />
          <div className="grid grid-cols-5 gap-1.5">
            {(['jeum', 'eum', 'mom', 'both', 'all'] as const).map(c => (
              <button
                key={c}
                id={`archive-child-${c}`}
                type="button"
                onClick={() => setChild(c)}
                className="py-2 rounded-xl text-[10px] font-black transition-all"
                style={{
                  background: child === c ? CHILD_COLOR[c].bg : 'rgba(255,255,255,0.05)',
                  color: child === c ? CHILD_COLOR[c].color : 'var(--text-muted)',
                  border: `1px solid ${child === c ? CHILD_COLOR[c].color : 'transparent'}`,
                }}
              >
                {CHILD_LABEL[c]}
              </button>
            ))}
          </div>
          <input
            id="archive-desc"
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="설명 (선택)"
            className="input-field"
          />
          <label
            htmlFor="archive-file-input"
            className="btn btn-primary w-full cursor-pointer"
            style={{ opacity: isUploading ? 0.7 : 1 }}
          >
            <Upload size={15} />
            {isUploading ? '업로드 중...' : '이미지 / PDF 선택'}
          </label>
          <input
            ref={fileRef}
            id="archive-file-input"
            type="file"
            accept="image/*,.pdf"
            onChange={handleUpload}
            className="hidden"
            disabled={isUploading}
          />
        </div>
      </div>

      {/* 파일 목록 */}
      {archives.length === 0 ? (
        <div className="py-10 text-center glass-card">
          <File size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>업로드된 파일이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {archives.map(item => {
            const c = item.child;
            return (
              <div
                key={item.id}
                className="glass-card p-3 flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: CHILD_COLOR[c].bg }}
                >
                  {item.file_type === 'pdf' ? (
                    <File size={18} style={{ color: CHILD_COLOR[c].color }} />
                  ) : (
                    <FileImage size={18} style={{ color: CHILD_COLOR[c].color }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </p>
                    <span className="badge" style={{ background: CHILD_COLOR[c].bg, color: CHILD_COLOR[c].color }}>
                      {CHILD_LABEL[c]}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    id={`archive-view-${item.id}`}
                    onClick={() => setPreviewItem(item)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                    aria-label="보기"
                  >
                    <Eye size={14} style={{ color: 'var(--text-secondary)' }} />
                  </button>
                  <button
                    id={`archive-delete-${item.id}`}
                    onClick={() => onDeleted(item.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                    style={{ background: 'rgba(239,68,68,0.1)' }}
                    aria-label="삭제"
                  >
                    <Trash2 size={14} style={{ color: '#f87171' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 파일 미리보기 모달 */}
      {previewItem && (
        <div className="modal-overlay" onClick={() => setPreviewItem(null)}>
          <div
            className="glass-card w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                {previewItem.title}
              </h3>
              <button
                id="preview-close"
                onClick={() => setPreviewItem(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.06)' }}
                aria-label="닫기"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {previewItem.file_type === 'image' ? (
                <img
                  src={previewItem.file_url}
                  alt={previewItem.title}
                  className="w-full h-auto rounded-xl"
                />
              ) : (
                <iframe
                  src={previewItem.file_url}
                  title={previewItem.title}
                  className="w-full h-96 rounded-xl"
                  style={{ border: 'none', background: 'white' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
