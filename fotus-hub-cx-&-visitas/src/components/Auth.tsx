import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, LoaderCircle, ShieldCheck } from 'lucide-react';
import {
  auth,
  browserLocalPersistence,
  googleProvider,
  getRedirectResult,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
} from '../lib/firebase';
import { isAuthorizedEmail } from '../lib/auth';

const LOGIN_BACKGROUND = 'https://res.cloudinary.com/dsctpzqvy/image/upload/v1787849943/ChatGPT_Image_27_de_ago._de_2026_14_t1lv54.png';
const LOGIN_LOGO = 'https://res.cloudinary.com/dsctpzqvy/image/upload/v1787849891/ChatGPT_Image_27_de_ago._de_2026_13_58_03_l7q8kp.png';

function getLoginErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code.includes('unauthorized-domain')) {
    return 'Este endereço da Vercel ainda não foi autorizado no Firebase. Adicione o domínio em Authentication > Settings > Authorized domains.';
  }
  if (code.includes('popup-closed-by-user')) return 'A janela do Google foi fechada antes da conclusão.';
  if (code.includes('popup-blocked')) return 'O navegador bloqueou a janela do Google. Libere pop-ups para este site.';
  if (code.includes('cancelled-popup-request')) return 'Já existe uma tentativa de login em andamento.';
  return 'Não foi possível entrar com o Google. Confira a configuração do domínio no Firebase e tente novamente.';
}

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    getRedirectResult(auth).catch((error) => {
      if (error && typeof error === 'object' && 'code' in error && String(error.code).includes('unauthorized-domain')) {
        setErrorMessage(getLoginErrorMessage(error));
      }
    });
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, googleProvider);
      if (!isAuthorizedEmail(result.user.email)) {
        await auth.signOut();
        setErrorMessage('Acesso não autorizado. Use um e-mail @fotus.com.br ou a conta de desenvolvimento liberada.');
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      if (code.includes('popup-blocked') || code.includes('cancelled-popup-request')) {
        setErrorMessage('Abrindo o Google em uma página segura...');
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f7f4] font-sans text-gray-900 lg:grid lg:grid-cols-[minmax(420px,46%)_1fr]">
      <section className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-md">
          <img src={LOGIN_LOGO} alt="Fotus" className="mb-10 h-24 w-auto object-contain" />

          <div className="mb-8">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#385041]/15 bg-[#e8efe0] px-3 py-1.5 text-xs font-bold text-[#385041]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Acesso protegido pelo Google
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl">Fotus Hub</h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-gray-600">
              Entre para acessar CX, ocorrências, custos extras, Reclame Aqui, visitas e a estrutura de direcionamento dos times.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="flex w-full items-center justify-between rounded-2xl bg-[#385041] px-5 py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(56,80,65,0.25)] transition-all hover:bg-[#2c4033] disabled:cursor-wait disabled:opacity-70"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
                {loading ? (
                  <LoaderCircle className="h-5 w-5 animate-spin text-[#385041]" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09A6.7 6.7 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
              </span>
              {loading ? 'Conectando ao Google...' : 'Continuar com Google'}
            </span>
            <ArrowRight className="h-5 w-5" />
          </button>

          <p className="mt-5 text-xs leading-relaxed text-gray-500">
            Permitido para contas <strong>@fotus.com.br</strong> e para a conta de desenvolvimento autorizada.
          </p>
        </div>
      </section>

      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${LOGIN_BACKGROUND})` }} />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#1d2d24]/75 via-[#385041]/25 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 rounded-3xl border border-white/20 bg-white/10 p-7 text-white backdrop-blur-lg">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/70">Operação conectada</p>
          <h2 className="mt-2 text-2xl font-bold">Decisões mais rápidas, dados em um só lugar.</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
            Um ambiente único para acompanhar a jornada do cliente e direcionar cada demanda à liderança correta.
          </p>
        </div>
      </section>
    </div>
  );
}
