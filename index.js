gopeed.events.onResolve(async (ctx) => {
    const url = ctx.req.url;
    gopeed.logger.info("Analizando URL de episodio/película: " + url);

    try {
        // 1. Descargamos el HTML de la página donde está el reproductor
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
                "Referer": url
            }
        });
        
        const html = await response.text();
        let videoUrl = "";

        // ESTRATEGIA 1: Buscar archivos de video directos (.mp4, .mkv) en el código fuente
        gopeed.logger.info("Buscando enlaces directos .mp4/.mkv...");
        const mp4Regex = /(?:src|href|file)["']?\s*:\s*["']([^"']+\.(?:mp4|mkv)[^"']*)["']/i;
        const mp4Match = html.match(mp4Regex);

        if (mp4Match && mp4Match[1]) {
            videoUrl = mp4Match[1];
            gopeed.logger.info("Video directo encontrado: " + videoUrl);
        } else {
            // ESTRATEGIA 2: Buscar listas de reproducción HLS (.m3u8)
            gopeed.logger.info("Buscando listas de reproducción .m3u8...");
            const m3u8Regex = /(?:src|href|file)["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i;
            const m3u8Match = html.match(m3u8Regex);

            if (m3u8Match && m3u8Match[1]) {
                videoUrl = m3u8Match[1];
                gopeed.logger.info("Lista m3u8 encontrada: " + videoUrl);
            } else {
                // ESTRATEGIA 3: Buscar iframes de servidores externos
                gopeed.logger.info("Buscando reproductores incrustados (iframes)...");
                const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/i;
                const iframeMatch = html.match(iframeRegex);

                if (iframeMatch && iframeMatch[1]) {
                    let iframeUrl = iframeMatch[1];
                    
                    if (iframeUrl.startsWith('//')) {
                        iframeUrl = 'https:' + iframeUrl;
                    } else if (iframeUrl.startsWith('/')) {
                        const urlObj = new URL(url);
                        iframeUrl = urlObj.origin + iframeUrl;
                    }

                    gopeed.logger.info("Iframe encontrado: " + iframeUrl);
                    videoUrl = iframeUrl;
                }
            }
        }

        // Si no encontramos nada, usamos la URL original
        if (!videoUrl) {
            gopeed.logger.warn("No se encontró un video claro. Se enviará la URL original.");
            videoUrl = url;
        }

        // Limpiar la URL de caracteres de escape
        videoUrl = videoUrl.replace(/\\/g, '');

        // 3. Devolver el resultado a Gopeed
        ctx.res = {
            name: "TioPlus_Video",
            files: [
                {
                    name: "video_tioplus.mp4", 
                    req: {
                        url: videoUrl,
                        headers: {
                            // Importante para evitar bloqueos por hotlinking
                            "Referer": url,
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
                        }
                    }
                }
            ]
        };

    } catch (error) {
        gopeed.logger.error("Error al procesar la página: " + error.message);
    }
});


