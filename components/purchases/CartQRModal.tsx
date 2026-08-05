import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import * as QRCode from 'qrcode';
import type { PurchaseItem } from '../../types/purchases';
import { Modal } from '../common';
import {
  mergeDuplicateLines,
  parsePage,
  serializePages,
  type CartQrLine,
} from '../../utils/cartQr';
import { InlineBarcodeScanner } from '../mobile/InlineBarcodeScanner';

const QR_SIZE = 240;
const CAPTION_H = 13;

/**
 * Render a QR payload to a PNG that includes a caption line wired into the image
 * (below the modules, in the quiet zone, so it never overlaps scannable modules).
 * The count is therefore visually part of the image itself, not a DOM badge.
 */
async function renderQrWithCaption(text: string, caption: string): Promise<string> {
  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, text, { width: QR_SIZE, margin: 2, errorCorrectionLevel: 'M' });

  const out = document.createElement('canvas');
  out.width = QR_SIZE;
  out.height = QR_SIZE + CAPTION_H;
  const ctx = out.getContext('2d');
  if (!ctx) return qr.toDataURL('image/png');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(qr, 0, 0);

  ctx.fillStyle = '#111827';
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(caption, out.width / 2, QR_SIZE + CAPTION_H / 2 + 1);
  return out.toDataURL('image/png');
}

export interface CartQrScanReport {
  invalid: number;
  skipped: number;
}

interface CartQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: PurchaseItem[];
  t: Translations;
  language: 'EN' | 'AR';
  onScanned: (lines: CartQrLine[], report: CartQrScanReport) => void;
  resolveDrugInfo?: (barcode: string) => { name: string; dosageForm?: string } | undefined;
}

/** "items" label used inside the rendered QR caption. */
export const cartQrItemsLabel = (t: Translations, language: 'EN' | 'AR') =>
  (t.cartQr as Record<string, string> | undefined)?.items ??
  (language === 'AR' ? 'أصناف' : 'Items');

export const CartQRModal: React.FC<CartQRModalProps> = ({
  isOpen,
  onClose,
  cart,
  t,
  language,
  onScanned,
  resolveDrugInfo,
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'scan'>('generate');
  const [pageIndex, setPageIndex] = useState(0);
  const [qrUrls, setQrUrls] = useState<string[]>([]);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [pendingPreview, setPendingPreview] = useState<CartQrLine[] | null>(null);
  const [pendingInvalid, setPendingInvalid] = useState(0);

  // Buffer fragments keyed by transaction timestamp; overwrite same pageIndex safely.
  const bufferRef = useRef<{
    ts: number;
    total: number;
    fragments: (CartQrLine[] | null)[];
    invalid: number[];
  } | null>(null);
  const [bufferProgress, setBufferProgress] = useState<{ total: number; done: number } | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const tqr = (t as Translations).cartQr;
  const label = (key: string, fallback: string) => (tqr as Record<string, string> | undefined)?.[key] ?? fallback;
  const dir = language === 'AR' ? 'rtl' : 'ltr';

  // Regenerate QR(s) whenever cart / open state changes.
  useEffect(() => {
    if (!isOpen) return;
    const result = serializePages(cart);
    setQrUrls([]);
    let cancelled = false;
    Promise.all(
      result.pages.map((text) => {
        // Count = number of item rows on this page (header field is last).
        const parts = text.split('\n');
        const count = parts.length - 1;
        return renderQrWithCaption(
          text,
          `${cartQrItemsLabel(t, language)}: ${count}`
        );
      })
    ).then((urls) => {
      if (!cancelled) setQrUrls(urls);
    });
    setPageIndex(0);
    return () => {
      cancelled = true;
    };
  }, [isOpen, cart, t, language]);

  // Reset scan state when opening.
  useEffect(() => {
    if (isOpen) {
      setActiveTab(cart.length === 0 ? 'scan' : 'generate');
      bufferRef.current = null;
      setBufferProgress(null);
      setScanStatus(null);
      setPendingPreview(null);
      setPendingInvalid(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleScan = (raw: string) => {
    const parsed = parsePage(raw);
    if (!parsed) {
      setScanStatus(label('invalidQr', 'Unrecognized QR. Please scan the cart QR.'));
      return;
    }
    let buf = bufferRef.current;
    if (!buf || buf.ts !== parsed.fragment.ts) {
      buf = {
        ts: parsed.fragment.ts,
        total: parsed.fragment.totalPages,
        fragments: new Array(parsed.fragment.totalPages).fill(null),
        invalid: new Array(parsed.fragment.totalPages).fill(0),
      };
      bufferRef.current = buf;
    }
    // Overwrite by index (safe on duplicate rescan of the same page).
    buf.fragments[parsed.fragment.pageIndex] = parsed.lines;
    buf.invalid[parsed.fragment.pageIndex] = parsed.invalid;

    const filled = buf.fragments.every((f) => f !== null);
    const done = buf.fragments.filter((f) => f !== null).length;

    if (!filled) {
      setBufferProgress({ total: buf.total, done });
      setScanStatus(label('scanMore', 'Awaiting more pages...'));
      return;
    }

    const all = buf.fragments.flat() as CartQrLine[];
    const merged = mergeDuplicateLines(all);
    const invalid = buf.invalid.reduce((a, b) => a + b, 0);

    setScanStatus(label('done', `${merged.length} items scanned.`));
    bufferRef.current = null;
    setBufferProgress(null);

    // Pause for review before committing to the cart.
    setPendingInvalid(invalid);
    setPendingPreview(merged);
  };

  const confirmAdd = () => {
    if (!pendingPreview) return;
    onScanned(pendingPreview, { invalid: pendingInvalid, skipped: 0 });
    onClose();
  };

  const discardPreview = () => {
    setPendingPreview(null);
    setPendingInvalid(0);
    setScanStatus(null);
  };

  const hasQr = qrUrls.length > 0;
  const pages = qrUrls.length;

  const copyPayload = () => {
    // Re-serialize the current page for a copy-friendly text payload.
    const text = serializePages(cart).pages[pageIndex] ?? '';
    if (!text) return;

    // Fallback for non-secure contexts / denied permission where the Clipboard API is absent.
    const legacyCopy = (): boolean => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      document.body.removeChild(ta);
      return ok;
    };

    const finish = (ok: boolean) => {
      setCopyStatus(ok ? 'copied' : 'error');
      window.setTimeout(() => setCopyStatus('idle'), 2000);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => finish(true))
        .catch(() => finish(legacyCopy()));
    } else {
      finish(legacyCopy());
    }
  };

  const downloadQr = () => {
    const url = qrUrls[pageIndex];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `cart-qr-${pages > 1 ? `page-${pageIndex + 1}-of-${pages}` : 'single'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={label('title', 'Cart QR')}
      size='md'
      footer={
        activeTab === 'scan' && pendingPreview ? (
          <div className='flex items-center gap-3 w-full' dir={dir}>
            <button
              type='button'
              onClick={discardPreview}
              className='flex-1 py-3 rounded-full font-bold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 cursor-pointer transition-colors flex items-center justify-center gap-2'
            >
              <span className='material-symbols-rounded text-base'>close</span>
              {label('discard', 'Discard')}
            </button>
            <button
              type='button'
              onClick={confirmAdd}
              disabled={pendingPreview.length === 0}
              className='flex-1 py-3 rounded-full font-bold text-white bg-primary-600 hover:bg-primary-700 cursor-pointer transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <span className='material-symbols-rounded text-base'>add_shopping_cart</span>
              {label('addToCart', 'Add to cart')}
            </button>
          </div>
        ) : undefined
      }
      tabs={[
        {
          value: 'generate',
          label: label('generate', 'Generate'),
          icon: 'qr_code',
        },
        {
          value: 'scan',
          label: label('scan', 'Scan'),
          icon: 'qr_code_scanner',
        },
      ]}
      activeTab={activeTab}
      onTabChange={(v) => setActiveTab(v as 'generate' | 'scan')}
      closeOnBackdropClick={false}
    >
      {activeTab === 'generate' ? (
        <div dir={dir} className='flex flex-col items-center gap-4 py-2'>
          {cart.length === 0 ? (
            <div className='h-48 flex flex-col items-center justify-center gap-2 text-gray-400'>
              <span className='material-symbols-rounded text-4xl opacity-50'>remove_shopping_cart</span>
              <span className='text-sm'>{label('emptyCart', 'Cart is empty')}</span>
            </div>
          ) : !hasQr ? (
            <div className='h-48 flex flex-col items-center justify-center gap-2 text-gray-400'>
              <span className='material-symbols-rounded text-3xl animate-spin'>refresh</span>
              <span className='text-xs'>{label('generating', 'Generating...')}</span>
            </div>
          ) : (
            <>
              <div className='flex flex-col items-center gap-2'>
                {pages > 1 && (
                  <div className='flex items-center gap-3'>
                    <button
                      type='button'
                      disabled={pageIndex === 0}
                      onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                      className='w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 flex items-center justify-center'
                    >
                      <span className='material-symbols-rounded text-lg'>chevron_left</span>
                    </button>
                    <span className='text-xs font-bold text-gray-500 dark:text-gray-400'>
                      {label('page', 'Page')} {pageIndex + 1}/{pages}
                    </span>
                    <button
                      type='button'
                      disabled={pageIndex >= pages - 1}
                      onClick={() => setPageIndex((i) => Math.min(pages - 1, i + 1))}
                      className='w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 flex items-center justify-center'
                    >
                      <span className='material-symbols-rounded text-lg'>chevron_right</span>
                    </button>
                  </div>
                )}
                <div className='relative'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrls[pageIndex]}
                    alt='Cart QR'
                    style={{ width: 224, height: 224 + CAPTION_H }}
                    className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white p-1 shadow-sm'
                  />
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={copyPayload}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${copyStatus === 'copied'
                    ? 'border-green-300 dark:border-green-700 text-green-600 dark:text-green-400'
                    : copyStatus === 'error'
                      ? 'border-red-300 dark:border-red-700 text-red-600 dark:text-red-400'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                    }`}
                >
                  <span className='material-symbols-rounded text-base'>
                    {copyStatus === 'copied'
                      ? 'check'
                      : copyStatus === 'error'
                        ? 'error'
                        : 'content_copy'}
                  </span>
                  {copyStatus === 'copied'
                    ? label('copied', 'Copied!')
                    : copyStatus === 'error'
                      ? label('copyFailed', 'Copy failed')
                      : label('copy', 'Copy payload')}
                </button>

                <button
                  type='button'
                  onClick={downloadQr}
                  className='flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors'
                >
                  <span className='material-symbols-rounded text-base'>download</span>
                  {label('download', 'Download')}
                </button>
              </div>

              <p className='text-xs text-gray-400 text-center max-w-xs'>
                {label('generateHint', 'Scan the QR in Purchases on the receiving pharmacy to load the items.')}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className='flex flex-col gap-3'>
          {pendingPreview ? (
            <div className='flex flex-col gap-3'>
              <p className='text-sm font-semibold text-gray-700 dark:text-gray-200'>
                {label('previewTitle', 'Review before adding')}
              </p>
              {pendingPreview.length === 0 ? (
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  {label('emptyPreview', 'No readable items found in the scanned QR.')}
                </p>
              ) : (
                <div className='max-h-56 overflow-y-auto custom-scrollbar rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800'>
                  {pendingPreview.map((l) => {
                    const drugInfo = resolveDrugInfo?.(l.code);
                    return (
                      <div key={`${l.code}|${l.expiry}|${l.qty}`} dir='ltr' className='flex flex-row items-center justify-between gap-3 px-3 py-2 text-sm'>
                        <div className='flex flex-col min-w-0 flex-1 text-left'>
                          <span className='font-semibold text-xs text-gray-800 dark:text-gray-200 truncate'>
                            {drugInfo
                              ? `${drugInfo.name}${drugInfo.dosageForm ? ` ${drugInfo.dosageForm}` : ''}`
                              : label('unknownDrug', 'Unknown Drug')}
                          </span>
                          <span className='font-mono text-[10px] text-gray-500 dark:text-gray-400 truncate'>
                            {l.code}
                          </span>
                        </div>
                        <span className='text-xs text-gray-400 whitespace-nowrap'>{l.expiry.split('-').reverse().join('/')}</span>
                        <div className='flex items-baseline justify-end gap-0.5 min-w-[40px]'>
                          <span className='text-xs font-semibold text-gray-500 dark:text-gray-400'>x</span>
                          <span className='text-xl font-black text-gray-900 dark:text-white leading-none'>{l.qty}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              <InlineBarcodeScanner
                onScanSuccess={handleScan}
                onClose={onClose}
                color='var(--primary-color)'
                size='full'
              />
              {bufferProgress && (
                <div className='text-center'>
                  <span className='text-sm font-semibold text-primary-600 dark:text-primary-400'>
                    {label('scanMore', 'Scanning...')} {bufferProgress.done}/{bufferProgress.total}
                  </span>
                </div>
              )}
              {scanStatus && (
                <div className='text-center text-sm text-gray-600 dark:text-gray-300'>
                  {scanStatus}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
};