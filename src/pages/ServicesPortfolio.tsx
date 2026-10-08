import ServiceGallery from '@/components/ServiceGallery';
import { useEffect } from 'react';

export default function ServicesPortfolio() {
  useEffect(() => { document.title = 'Serviços Realizados'; }, []);
  return <ServiceGallery asPage />;
}
