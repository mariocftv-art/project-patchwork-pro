import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { servicePhotosApi, ServicePhoto } from '@/lib/servicePhotosApi';
import { Camera, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export default function ServiceGallery() {
  const [selectedPhoto, setSelectedPhoto] = useState<ServicePhoto | null>(null);
  
  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['service-photos'],
    queryFn: () => servicePhotosApi.list(),
  });

  if (isLoading) {
    return (
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-pulse h-8 w-64 bg-muted rounded mx-auto mb-4" />
            <div className="animate-pulse h-4 w-96 bg-muted rounded mx-auto" />
          </div>
        </div>
      </section>
    );
  }

  if (photos.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Camera className="w-6 h-6 text-primary" />
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Nossos Serviços Realizados
            </h2>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Confira alguns dos projetos de segurança que já realizamos para nossos clientes
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              {/* Image Container */}
              <div className="aspect-square overflow-hidden bg-muted">
                <img
                  src={photo.image_url}
                  alt={photo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              
              {/* Description - Outside the image */}
              <div className="p-4">
                <h3 className="font-semibold text-foreground text-sm line-clamp-1">
                  {photo.title}
                </h3>
                {photo.description && (
                  <p className="text-muted-foreground text-xs line-clamp-2 mt-1">
                    {photo.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 bg-black/95 border-none">
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          {selectedPhoto && (
            <div className="flex flex-col">
              <div className="relative w-full max-h-[70vh] flex items-center justify-center p-4">
                <img
                  src={selectedPhoto.image_url}
                  alt={selectedPhoto.title}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>
              
              <div className="p-6 bg-card rounded-b-lg">
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedPhoto.title}
                </h3>
                {selectedPhoto.description && (
                  <p className="text-muted-foreground mt-2">
                    {selectedPhoto.description}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
