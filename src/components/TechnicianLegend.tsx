
import React from 'react';
import { Technician } from '../types/supabase';

interface TechnicianLegendProps {
  technicians: Technician[];
  selectedTech: string;
  onTechnicianSelect: (techId: string) => void;
}

const TechnicianLegend: React.FC<TechnicianLegendProps> = ({
  technicians,
  selectedTech,
  onTechnicianSelect
}) => {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {technicians.map((tech) => (
        <span 
          key={tech.id} 
          className={`px-2 py-1 rounded-md shadow-sm inline-flex items-center cursor-pointer transition-all ${selectedTech === tech.id ? 'ring-2 ring-blue-500' : ''}`} 
          style={{ background: tech.color, color: 'white' }}
          onClick={() => onTechnicianSelect(tech.id)}
        >
          <span 
            className="color-circle mr-2" 
            style={{ 
              background: 'white', 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              display: 'inline-block' 
            }}
          />
          {tech.name}
        </span>
      ))}
    </div>
  );
};

export default TechnicianLegend;
