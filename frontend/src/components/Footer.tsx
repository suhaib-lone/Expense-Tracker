import React from 'react';
import { Heart } from 'lucide-react';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-900 text-gray-300 py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm">
              © {year} Prophet Forecaster
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Powered by Facebook Prophet and FastAPI
            </p>
          </div>
          
          <div className="flex items-center">
            <span className="text-sm mr-2">Built with</span>
            <Heart size={16} className="text-red-500 mr-2" />
            <span className="text-sm">using React and TailwindCSS</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;