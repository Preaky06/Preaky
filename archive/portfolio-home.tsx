
   import CustomCursor from "@/components/CustomCursor";
import KineticText from "@/components/KineticText";
import Lightbox from "@/components/Lightbox";
import ProjectCard from "@/components/ProjectCard";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, Instagram, Mail, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [selectedProject, setSelectedProject] = useState<null | typeof projects[0]>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const projects = [
    {
      title: "Grotte & Grill",
      category: "Logo Design",
      image: "/images/grotte-grill.png",
    },
    {
      title: "Magic Planes",
      category: "Branding",
      image: "/images/magic-planes.png",
    },
    {
      title: "V Logo",
      category: "Identity",
      image: "/images/v-logo.jpg",
    },
    {
      title: "Elevator Club",
      category: "Typography",
      image: "/images/elevator-club.jpg",
    },
    {
      title: "Cloud 3D",
      category: "3D Illustration",
      image: "/images/cloud-3d.webp",
    },
    {
      title: "Sprite Redesign",
      category: "Rebranding",
      image: "/images/sprite-redesign.jpg",
    },
    {
      title: "Totti Legend",
      category: "Poster Art",
      image: "/images/totti-poster.jpg",
    },
    {
      title: "Neymar Jr",
      category: "Sports Graphics",
      image: "/images/neymar-poster.jpg",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-200 selection:text-black overflow-x-hidden">
      {/* CustomCursor removed for cleaner fluffy feel */}

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full p-4 md:p-8 flex justify-between items-center z-40 bg-white/80 backdrop-blur-sm">
        <img src="/images/preaky-logo.png" alt="Preaky Logo" className="h-12 md:h-16 w-auto object-contain" />
        
        {/* Desktop Menu */}
        <div className="hidden md:flex gap-8 font-mono text-sm text-neutral-900 font-medium">
          <a href="#about" className="hover-trigger hover:text-neutral-500 transition-colors">À PROPOS</a>
          <a href="#work" className="hover-trigger hover:text-neutral-500 transition-colors">CRÉATIONS</a>
          <a href="#contact" className="hover-trigger hover:text-neutral-500 transition-colors">CONTACT</a>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-neutral-900 p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-30 bg-white flex flex-col items-center justify-center gap-8 md:hidden"
          >
            <a 
              href="#about" 
              className="font-display text-4xl text-neutral-900 hover:text-neutral-500 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              À PROPOS
            </a>
            <a 
              href="#work" 
              className="font-display text-4xl text-neutral-900 hover:text-neutral-500 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              CRÉATIONS
            </a>
            <a 
              href="#contact" 
              className="font-display text-4xl text-neutral-900 hover:text-neutral-500 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              CONTACT
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center items-center relative px-4 pt-20 md:pt-0">
        <div className="z-10 text-center w-full max-w-[95vw] overflow-hidden">
          <h1 className="block text-[12vw] md:text-[10vw] leading-[0.85] font-display font-normal tracking-wide break-words text-neutral-900 drop-shadow-sm">
            PREAKY'S
          </h1>
          <h1 className="block text-[12vw] md:text-[10vw] leading-[0.85] font-display font-normal tracking-wide break-words text-neutral-900 drop-shadow-sm">
            PORTFOLIO
          </h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="mt-6 md:mt-8 font-mono text-neutral-500 text-xs md:text-base max-w-xs md:max-w-md mx-auto px-4 font-medium"
          >
            Design graphique • Identité visuelle • Art numérique
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
        >
          <ArrowDown className="w-6 h-6 text-neutral-400" />
        </motion.div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 md:py-32 container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
          <div className="relative aspect-[3/4] overflow-hidden group rounded-2xl shadow-xl">
            <img 
              src="/images/mael-profile.jpg" 
              alt="Maël Gillet" 
              className="w-full h-full object-cover transition-all duration-700 hover:scale-105"
            />
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-5xl md:text-7xl font-display font-normal mb-8 tracking-wide text-neutral-900">
              MAËL <br/>
              <span className="text-neutral-900 hover:text-neutral-600 transition-colors duration-300">GILLET</span>
            </h2>
            <p className="font-mono text-neutral-600 text-base md:text-lg leading-relaxed mb-6 font-medium">
              J'ai 20 ans et je suis passionné de graphisme et de communication digitale. Actuellement en formation Community Manager et Communication Digitale, je transforme les idées en expériences visuelles percutantes.
            </p>
            <p className="font-mono text-neutral-600 text-base md:text-lg leading-relaxed font-medium">
              Mon approche allie créativité brute et stratégie numérique pour donner vie à des projets uniques. Bienvenue dans mon univers où chaque pixel a son importance.
            </p>
          </div>
        </div>
      </section>

      {/* Work Section */}
      <section id="work" className="py-20 md:py-32 bg-neutral-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 md:mb-20 gap-4">
            <h2 className="text-5xl md:text-7xl font-display font-normal tracking-wide text-neutral-900">
              MES <br/> CRÉATIONS
            </h2>
            <span className="font-mono text-neutral-400 text-lg md:text-xl font-medium">(0{projects.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {projects.map((project, index) => (
              <ProjectCard 
                key={index}
                index={index}
                {...project}
                onClick={() => setSelectedProject(project)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {selectedProject && (
        <Lightbox
          isOpen={!!selectedProject}
          image={selectedProject.image}
          title={selectedProject.title}
          category={selectedProject.category}
          onClose={() => setSelectedProject(null)}
        />
      )}

      {/* Contact Section */}
      <section id="contact" className="py-20 md:py-32 container mx-auto px-4 text-center overflow-hidden">
        <h2 className="text-[15vw] md:text-[12vw] font-display font-normal tracking-wide leading-none mb-12 hover-trigger break-words text-neutral-900">
          LET'S TALK
        </h2>
        
        <div className="flex flex-col md:flex-row justify-center gap-8 md:gap-12">
          <a 
            href="https://instagram.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-4 hover-trigger"
          >
            <div className="w-20 h-20 rounded-full border border-neutral-200 flex items-center justify-center group-hover:bg-neutral-900 group-hover:border-neutral-900 transition-all duration-300">
              <Instagram className="w-8 h-8 text-neutral-900 group-hover:text-white transition-colors" />
            </div>
            <span className="font-mono text-sm tracking-widest uppercase group-hover:text-neutral-900 transition-colors font-medium">Instagram</span>
          </a>

          <a 
            href="mailto:contact@preaky.com" 
            className="group flex flex-col items-center gap-4 hover-trigger"
          >
            <div className="w-20 h-20 rounded-full border border-neutral-200 flex items-center justify-center group-hover:bg-neutral-900 group-hover:border-neutral-900 transition-all duration-300">
              <Mail className="w-8 h-8 text-neutral-900 group-hover:text-white transition-colors" />
            </div>
            <span className="font-mono text-sm tracking-widest uppercase group-hover:text-neutral-900 transition-colors font-medium">Email</span>
          </a>
        </div>

        <footer className="mt-32 pt-8 border-t border-neutral-200 flex justify-between font-mono text-xs text-neutral-400">
          <span>© 2026 PREAKY'S PORTFOLIO</span>
          <span>DESIGNED BY MANUS</span>
        </footer>
      </section>
    </div>
  );
}
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* ... (variables de couleurs standard omises pour la clarté) ... */
  --font-display: "Titan One", cursive;
  --font-mono: "Fredoka", sans-serif;
}

@layer base {
  body {
    @apply bg-white text-neutral-900;
    font-family: 'Fredoka', sans-serif;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Titan One', cursive;
  }
  
  .font-display {
    font-family: 'Titan One', cursive;
  }
  
  .font-mono {
    font-family: 'Fredoka', sans-serif;
  }

  .stroke-text {
    /* Removed stroke effect for filled text request */
    -webkit-text-stroke: 0;
    color: currentColor;
  }
  .hover-trigger:hover {
    @apply opacity-70 transition-opacity duration-300;
  }
  /* ... (styles de boutons standard omis) ... */
}

@layer components {
  /* ... (styles de conteneur standard omis) ... */
}
import { motion } from "framer-motion";
import { useState } from "react";

interface ProjectCardProps {
  title: string;
  category: string;
  image: string;
  index: number;
  onClick: () => void;
}

export default function ProjectCard({ title, category, image, index, onClick }: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="relative group w-full aspect-square overflow-hidden bg-white cursor-pointer rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Image Background */}
      <motion.img
        src={image}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* Overlay Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-100 transition-opacity duration-500">
        <h3 className="text-2xl font-display font-normal tracking-wide text-white mb-1 translate-y-0 transition-transform duration-500 drop-shadow-md">
          {title}
        </h3>
        <p className="font-mono text-white/90 text-sm translate-y-0 transition-transform duration-500 font-medium">
          {category}
        </p>
      </div>
    </motion.div>
  );
}
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

interface LightboxProps {
  isOpen: boolean;
  image: string;
  title: string;
  category: string;
  onClose: () => void;
}

export default function Lightbox({ isOpen, image, title, category, onClose }: LightboxProps) {
  // Empêcher le scroll quand la lightbox est ouverte
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 md:p-8"
          onClick={onClose}
        >
          <motion.button
            className="absolute top-4 right-4 md:top-8 md:right-8 text-white/50 hover:text-white transition-colors z-50 p-2"
            onClick={onClose}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
          >
            <X size={32} />
          </motion.button>

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg border border-white/10 shadow-2xl bg-neutral-900">
              <img
                src={image}
                alt={title}
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
            
            <div className="mt-6 text-center">
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-cyan-400 font-mono text-sm tracking-widest uppercase mb-2"
              >
                {category}
              </motion.p>
              <motion.h3 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-4xl font-display font-bold text-white uppercase tracking-tight"
              >
                {title}
              </motion.h3>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
<!doctype html>
<html lang="en">

  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>Preaky's Portfolio</title>    
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Titan+One&family=Fredoka:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
  </head>

  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script
      defer
      src="%VITE_ANALYTICS_ENDPOINT%/umami"
      data-website-id="%VITE_ANALYTICS_WEBSITE_ID%"></script>
  </body>

</html>

    