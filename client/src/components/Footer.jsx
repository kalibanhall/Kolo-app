import React from 'react';
import { Link } from 'react-router-dom';
import { LogoKoloFull } from './LogoKolo';
import { EmailIcon, PhoneIcon, LocationIcon } from './Icons';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo et Description */}
          <div>
            <div className="mb-4">
              <LogoKoloFull size="medium" darkMode={true} />
            </div>
            <p className="text-sm text-gray-400">
              Plateforme sécurisée de tombola en ligne
            </p>
          </div>

          {/* Navigation */}
          <div>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm hover:text-white transition">
                  Accueil
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm hover:text-white transition">
                  À propos
                </Link>
              </li>
              <li>
                <Link to="/vision" className="text-sm hover:text-white transition">
                  Notre Vision
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm hover:text-white transition">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-sm hover:text-white transition">
                  S'inscrire
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-sm hover:text-white transition">
                  Se connecter
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div className="space-y-2">
              <p className="text-sm flex items-center">
                <EmailIcon className="w-4 h-4 mr-2" />
                <a href="mailto:contact@kolo.cd" className="hover:text-white transition">
                  contact@kolo.cd
                </a>
              </p>
              <p className="text-sm flex items-center">
                <PhoneIcon className="w-4 h-4 mr-2" />
                <a href="tel:+243841209627" className="hover:text-white transition">
                  +243 841 209 627
                </a>
              </p>
              <p className="text-sm flex items-center">
                <LocationIcon className="w-4 h-4 mr-2" />
                Kinshasa, RDC
              </p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-sm text-gray-400">
            © {currentYear} KOLO - Plateforme sécurisée de tombola en ligne
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  );
};

export { Footer };
export default Footer;
