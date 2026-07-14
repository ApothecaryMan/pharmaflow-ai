import { ArrowRight, Building2 } from 'lucide-react';
import type { Employee } from '../../types';

interface Props {
  workspaces: Employee[];
  onSelect: (workspace: Employee) => void;
  onCancel?: () => void;
  t: Translations;
}

export function WorkspaceSwitcher({ workspaces, onSelect, onCancel, t }: Props) {
  const handleSelect = (workspace: Employee) => {
    onSelect(workspace);
  };

  return (
    <div className='flex flex-col items-center w-full max-w-md mx-auto'>
      <div className='w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 shadow-inner border border-emerald-500/20'>
        <Building2 className='w-8 h-8 text-emerald-400' />
      </div>

      <h2 className='text-2xl font-bold text-white mb-2'>{t.login.selectWorkspace}</h2>
      <p className='text-zinc-400 text-center mb-8'>{t.login.selectWorkspaceDesc}</p>

      <div className='w-full space-y-3'>
        {workspaces.map((workspace) => (
          <button
            key={workspace.id}
            onClick={() => handleSelect(workspace)}
            className='w-full bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800/50 rounded-xl p-4 flex items-center justify-between group transition-all'
            type='button'
          >
            <div className='flex items-center gap-4 text-left'>
              <div className='w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors'>
                <Building2 className='w-5 h-5 text-zinc-400 group-hover:text-emerald-400 transition-colors' />
              </div>
              <div>
                <h3 className='font-semibold text-white capitalize'>
                  {workspace.orgName || 'Pharmacy Organization'}
                </h3>
                <p className='text-sm text-zinc-500 capitalize flex items-center gap-2'>
                  <span>{workspace.role.replace('_', ' ')}</span>
                  {workspace.branchName && (
                    <>
                      <span className='w-1 h-1 rounded-full bg-zinc-600' />
                      <span>{workspace.branchName}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <ArrowRight className='w-5 h-5 text-zinc-600 group-hover:text-emerald-400 transition-colors transform group-hover:translate-x-1' />
          </button>
        ))}
      </div>

      {onCancel && (
        <button
          onClick={onCancel}
          className='mt-6 text-zinc-500 hover:text-white transition-colors'
          type='button'
        >
          {t.common?.cancel || 'Cancel'}
        </button>
      )}
    </div>
  );
}
