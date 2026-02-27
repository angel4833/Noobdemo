gopeed.events.onResolve(async (ctx) => {
    const url = ctx.req.url;
    gopeed.logger.info("Iniciando resolución para URL: " + url);

    try {
        // 1. Hacemos una petición silenciosa a la página web
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
            }
        });
        
        const html = await response.text();
        let downloadUrl = "";

        // 2. Buscamos en el HTML un enlace que termine en .apk usando una Expresión Regular
        const apkRegex = /href=["']([^"']+\.apk)["']/i;
        const apkMatch = html.match(apkRegex);

        if (apkMatch && apkMatch[1]) {
            downloadUrl = apkMatch[1];
            gopeed.logger.info("Se encontró un archivo APK directo: " + downloadUrl);
        } else {
            // Si no hay un .apk directo, buscamos cualquier botón que diga "descargar" o "download"
            const btnRegex = /href=["']([^"']*(?:descargar|download|obtener)[^"']*)["']/i;
            const btnMatch = html.match(btnRegex);
            
            if (btnMatch && btnMatch[1]) {
                downloadUrl = btnMatch[1];
                gopeed.logger.info("Se encontró un enlace alternativo de descarga: " + downloadUrl);
            }
        }

        // 3. Si no logramos encontrar nada en el código, le pasamos la URL original a Gopeed por si acaso
        if (!downloadUrl) {
            gopeed.logger.warn("No se encontró un enlace claro en el HTML. Usando URL original.");
            downloadUrl = url;
        }

        // 4. Si la URL encontrada es relativa (ej: /archivos/app.apk), la convertimos a absoluta
        if (downloadUrl.startsWith('/')) {
            const urlObj = new URL(url);
            downloadUrl = urlObj.origin + downloadUrl;
        }

        // 5. Le devolvemos el resultado a Gopeed para que inicie la descarga
        ctx.res = {
            name: "TioPlus_App", // Nombre del grupo de descarga
            files: [
                {
                    name: "tioplus_app.apk", // Nombre con el que se guardará el archivo
                    req: {
                        url: downloadUrl,
                        headers: {
                            // Enviamos el Referer para engañar al servidor y que crea que venimos de su web
                            "Referer": url,
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                        }
                    }
                }
            ]
        };

    } catch (error) {
        // Si la página se cae o rechaza la conexión, registramos el error
        gopeed.logger.error("Error al procesar la página de TioPlus: " + error.message);
    }
});
