import React, { useState, useRef } from 'react';
import { Upload, X, Wand2, Loader2 } from 'lucide-react';
import Button from './Button';
import { parseWishlistFromImage } from '../services/geminiService';
import { GeneratedGiftItem } from '../types';

interface AIParserModalProps {
  onClose: () => void;
  onItemsGenerated: (items: GeneratedGiftItem[]) => void;
}

const AIParserModal: React.FC<AIParserModalProps> = ({ onClose, onItemsGenerated }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic validation
      if (file.size > 5 * 1024 * 1024) {
        alert("File is too large! Please choose an image under 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!image) return;
    setLoading(true);
    try {
      // Pass the full Data URL (including mime type) to the service
      const items = await parseWishlistFromImage(image);
      
      if (items.length === 0) {
        alert("The elves couldn't find any items in that picture. Try writing clearer or getting closer!");
      } else {
        onItemsGenerated(items);
        onClose();
      }
    } catch (error: any) {
      console.error(error);
      const msg = error?.message || "Unknown error";
      if (msg.includes("API Key")) {
        alert("System Config Error: API Key is missing. Please check your .env file and restart the server.");
      } else {
        alert(`Oops! Something went wrong: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#FDF5E6] rounded-2xl max-w-md w-full p-6 shadow-2xl border-4 border-[#165B33] relative">
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 p-2 hover:bg-black/10 rounded-full"
        >
          <X className="w-6 h-6 text-[#165B33]" />
        </button>

        <div className="text-center mb-6">
          <h2 className="font-christmas text-3xl font-bold text-[#D42426] mb-2">Magic List Reader</h2>
          <p className="text-gray-600">Upload a photo of a handwritten note or a screenshot, and the elves will digitize it!</p>
        </div>

        {!image ? (
          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-3 border-dashed border-[#165B33]/30 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-[#165B33]/10 transition-colors bg-white/50"
            >
              <Upload className="w-12 h-12 text-[#165B33] mb-2" />
              <span className="font-bold text-[#165B33]">Upload a photo</span>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden aspect-video border-2 border-gray-200">
              <img src={image} alt="Preview" className="w-full h-full object-cover" />
            </div>
            
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setImage(null)} disabled={loading} className="flex-1">
                Retake
              </Button>
              <Button variant="christmas" onClick={processImage} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Elves Working...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" /> Make Magic
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIParserModal;