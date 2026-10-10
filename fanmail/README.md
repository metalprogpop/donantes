# fanmail

Arma el draft del próximo fanmail en Mailchimp con lo nuevo que haya en S3. Nunca envía nada.

```sh
cd fanmail
npm install
npm start -- --dry-run   # solo muestra el plan
npm start                # muestra el plan, pide confirmación y crea el draft
```

## Qué hace

1. Busca el último fanmail enviado (campañas cuyo título empieza con `Fanmail`) y el número de programa más alto que linkea.
2. Busca en el bucket los programas posteriores: `videos/ProgramaNNN-Parte k-Álbum.mp4` y `Poné REC/Poné Rec NNN.mp3`. Ignora `Audios/`, `reactions/`, las pruebas y los especiales.
3. Saca la banda de cada parte del [feed RSS](https://audioboom.com/channels/4940203.rss), emparejando por álbum. Si alguna no aparece, la pregunta.
4. Muestra el plan. Frena si falta alguna parte o el Poné Rec de un programa (`--allow-incomplete` para seguir igual), o si ya hay un draft con ese título (`--replace` regenera los links y conserva la intro y el cierre).
5. Después de confirmar: hace públicos los objetos (ACL `public-read`), verifica que los links respondan sin credenciales, sincroniza `template.html` como template de Mailchimp y crea el draft.

Queda escribir la intro en Mailchimp (reemplazar `[ESCRIBIR INTRO]`) y mandarlo.

## Configuración

- `config.json`: bucket, prefijos, audiencia, remitente y nombre del template.
- `.env` (no se commitea): `MAILCHIMP_API_KEY=...-usXX`.
- AWS: perfil `metalprogpop` en `~/.aws/credentials` (usuario IAM `fanmail-script`, que solo puede listar el bucket y cambiar ACLs).

## Template

`template.html` es la fuente de verdad del diseño. Tiene tres regiones editables (`intro`, `contenido`, `cierre`), cada una envuelta en marcadores `<!--fanmail:nombre-->`, que `--replace` usa para conservar lo que escribiste. El script crea o actualiza el template en Mailchimp en cada corrida. Para cambiar el diseño, editá el archivo.

## Tests

```sh
npm test
```
