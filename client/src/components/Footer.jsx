import React from 'react';
import { Link } from 'react-router-dom';
import { LogoKoloFull } from './LogoKolo';
import { EmailIcon, PhoneIcon, LocationIcon } from './Icons';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
          {/* Logo et Description */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-2 sm:mb-4">
              <LogoKoloFull size="small" darkMode={true} />
            </div>
            <p className="text-xs sm:text-sm text-gray-400">
              Koma Propriétaire - Là où un ticket peut changer une vie
            </p>
          </div>

          {/* Navigation - Compact */}
          <div>
            <ul className="space-y-1 sm:space-y-2">
              <li>
                <Link to="/" className="text-xs sm:text-sm hover:text-white transition">
                  Accueil
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-xs sm:text-sm hover:text-white transition">
                  À propos
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-xs sm:text-sm hover:text-white transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact - Compact */}
          <div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-xs sm:text-sm flex items-center">
                <EmailIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                <a href="mailto:contact@kolo.cd" className="hover:text-white transition truncate">
                  contact@kolo.cd
                </a>
              </p>
              <p className="text-xs sm:text-sm flex items-center">
                <PhoneIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                <a href="tel:+243841209627" className="hover:text-white transition">
                  +243 841 209 627
                </a>
              </p>
              <p className="text-xs sm:text-sm flex items-center">
                <LocationIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                Kinshasa, RDC
              </p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 mt-4 sm:mt-8 pt-4 sm:pt-8 text-center">
          <p className="text-xs sm:text-sm text-gray-400">
            © {currentYear} KOLO | Koma Propriétaire
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Là où un ticket peut changer une vie
          </p>
        </div>
      </div>
    </footer>
  );
};

export { Footer };
export default Footer;