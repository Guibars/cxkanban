import { auth, googleProvider, signInWithPopup } from '../lib/firebase';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function Auth() {
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user && res.user.email && !res.user.email.endsWith('@fotus.com.br') && res.user.email !== 'guilhermebarbosars@gmail.com') {
        await auth.signOut();
        alert('Acesso negado. Apenas e-mails @fotus.com.br são permitidos.');
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-gray-50 overflow-hidden font-sans">
      {/* Background Layer (Tropical Leaves) */}
      <div 
        className="absolute top-0 right-0 z-0 w-full md:w-[55%] h-full object-cover"
        style={{
          backgroundImage: 'url("https://res.cloudinary.com/dsctpzqvy/image/upload/v1787849943/ChatGPT_Image_27_de_ago._de_2026_14_t1lv54.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Wavy Overlay for Desktop (Simulated with curved SVG) */}
      <div className="absolute inset-y-0 left-0 w-[60%] bg-[#f8f9fa] z-10 hidden md:block"
           style={{
             clipPath: 'url(#wave)',
             filter: 'drop-shadow(15px 0 25px rgba(0,0,0,0.15))'
           }}>
        <svg width="0" height="0">
          <defs>
            <clipPath id="wave" clipPathUnits="objectBoundingBox">
              <path d="M0,0 L0.8,0 C0.9,0.2 0.7,0.4 0.85,0.5 C1,0.6 0.75,0.8 0.9,1 L0,1 Z" />
            </clipPath>
          </defs>
        </svg>
      </div>

      <div className="absolute inset-y-0 left-0 w-[57%] bg-white z-10 hidden md:block"
           style={{
             clipPath: 'url(#wave-inner)',
             filter: 'drop-shadow(10px 0 20px rgba(0,0,0,0.08))'
           }}>
        <svg width="0" height="0">
          <defs>
            <clipPath id="wave-inner" clipPathUnits="objectBoundingBox">
              <path d="M0,0 L0.8,0 C0.9,0.2 0.7,0.4 0.85,0.5 C1,0.6 0.75,0.8 0.9,1 L0,1 Z" />
            </clipPath>
          </defs>
        </svg>
      </div>
      
      {/* Login Card / Content */}
      <div className="relative z-20 w-full max-w-[420px] md:max-w-none md:w-full md:h-full flex items-center justify-center md:justify-start md:pl-[8%] lg:pl-[12%] px-4 md:px-0">
        
        {/* Mobile Glass Card / Desktop Form Container */}
        <div className="w-full md:w-[400px] bg-white/70 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none rounded-[2.5rem] md:rounded-none shadow-[0_8px_32px_rgba(0,0,0,0.1)] md:shadow-none p-8 sm:p-10 md:p-0 flex flex-col items-center md:items-start border border-white/50 md:border-none">
          
          <div className="w-full flex justify-center md:justify-start">
            <img 
              src="https://res.cloudinary.com/dsctpzqvy/image/upload/v1787849891/ChatGPT_Image_27_de_ago._de_2026_13_58_03_l7q8kp.png" 
              alt="Logo" 
              className="h-32 w-auto mb-6 object-contain drop-shadow-sm"
            />
          </div>
          
          <div className="w-full text-center md:text-left mb-6">
            <p className="text-xs text-[#385041] font-medium bg-[#e8efe0] inline-block px-3 py-1 rounded-full border border-[#d0e0c5] shadow-sm">
              Apenas e-mails @fotus.com.br são permitidos
            </p>
          </div>

          <div className="w-full">
            <h1 className="text-3xl font-semibold text-gray-800 mb-8 text-center md:text-left tracking-tight">Entrar</h1>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 ml-5 mb-1.5 tracking-wide">E-mail ou número de telefone</label>
                <input 
                  type="text" 
                  className="w-full bg-white md:bg-transparent border border-gray-300 md:border-gray-400/60 rounded-full px-6 py-3.5 text-sm focus:outline-none focus:border-[#385041] focus:ring-1 focus:ring-[#385041] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 ml-5 mb-1.5 tracking-wide">Senha</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="w-full bg-white md:bg-transparent border border-gray-300 md:border-gray-400/60 rounded-full pl-6 pr-12 py-3.5 text-sm focus:outline-none focus:border-[#385041] focus:ring-1 focus:ring-[#385041] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#385041] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="w-full bg-[#385041] hover:bg-[#2c4033] text-white font-medium py-3.5 rounded-full transition-colors mt-2 shadow-[0_4px_14px_rgba(56,80,65,0.4)] hover:shadow-[0_6px_20px_rgba(56,80,65,0.5)] transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Entrar
              </button>
              
              <div className="flex items-center justify-center gap-3 my-7">
                <div className="h-[1px] bg-gray-300 flex-1"></div>
                <span className="text-xs text-gray-400 font-medium px-2 tracking-wide">ou entrar com</span>
                <div className="h-[1px] bg-gray-300 flex-1"></div>
              </div>
              
              {/* Social Logins */}
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-5 border border-gray-300/80 rounded-full px-8 py-2.5 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <button onClick={handleLogin} className="hover:scale-110 transition-transform" title="Login with Google">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </button>
                  <div className="w-[1px] h-5 bg-gray-300"></div>
                  <button onClick={handleLogin} className="hover:scale-110 transition-transform opacity-80" title="Login with Office (Simulated via Google)">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#D83B01" d="M11.55 3.02L2.01 4.38v14.9l9.54 1.64V3.02zM12.45 2.87v17.92l9.54-1.96V5.04l-9.54-2.17z"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="text-center mt-8">
                <button className="text-xs text-[#6e9b87] hover:text-[#385041] font-medium transition-colors tracking-wide">
                  Esqueceu o login ou senha?
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
