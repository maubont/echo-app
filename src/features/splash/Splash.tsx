import { useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Splash = () => {
    const navigate = useNavigate();
    const { session, loading } = useAuth();
    color: 'rgb(212 212 216)',
        animation: 'fadeInUp 0.8s ease-out 0.4s both',
                }}
            >
    Tu círculo cercano
            </p >

    {/* Modern loading indicator */ }
    < div className = "relative w-32 h-1 rounded-full overflow-hidden" style = {{ background: 'rgba(88, 101, 242, 0.2)' }}>
        <div
            className="absolute h-full rounded-full"
            style={{
                background: 'linear-gradient(90deg, rgb(88 101 242), rgb(168 85 247))',
                animation: 'slideRight 1.5s ease-in-out infinite',
                width: '50%',
            }}
        ></div>
            </div >

    {/* CSS Animations */ }
    < style > {`
                @keyframes scaleIn {
                    from {
                        transform: scale(0.8);
                        opacity: 0;
                    }
                    to {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                
                @keyframes fadeInUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideRight {
                    0%, 100% {
                        transform: translateX(-100%);
                    }
                    50% {
                        transform: translateX(200%);
                    }
                }
            `}</style >
        </div >
    );
};
