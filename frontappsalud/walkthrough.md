# Walkthrough: Inicialización y Configuración del Proyecto Mobile (React Native + Expo)

Hemos inicializado con éxito tu aplicación móvil y configurado todo el entorno para que sea 100% modular y escalable.

---

## 🛠️ Cambios Realizados

1.  **Inicialización de Expo**: Creamos un proyecto de React Native con **Expo SDK 56** y **TypeScript** en la raíz de tu carpeta de trabajo.
2.  **Configuración del Nombre**: Cambiamos el identificador del proyecto a `"frontappsalud"` en el archivo `package.json`.
3.  **Instalación de Dependencias**:
    *   `lucide-react-native`: Para los iconos de visualización de contraseña.
    *   `dexie`: Para la base de datos local IndexedDB requerida por la estrategia offline.
4.  **Conexión de la Pantalla Principal**: Modificamos el archivo raíz `App.tsx` para que renderice directamente la pantalla de inicio de sesión (`LoginScreen`) y conecte los estilos.

---

## 📁 Nueva Estructura del Código

Tu carpeta ahora cuenta con la siguiente arquitectura estructurada de archivos:

```
frontappsalud/
├── src/
│   ├── theme/
│   │   └── index.ts          # Colores de la paleta (Yale Blue, Stormy Teal, etc.)
│   ├── components/
│   │   ├── Label.tsx         # Textos normalizados y tipografías
│   │   ├── Input.tsx         # Inputs de formularios y el componente FormInput
│   │   ├── Button.tsx        # Botones específicos (PrimaryButton, SecondaryButton, OutlineButton)
│   │   ├── Card.tsx          # Contenedores para formularios
│   │   └── Layout.tsx        # Primitivas de diseño offline (VStack, HStack, Box)
│   └── screens/
│       └── LoginScreen.tsx   # Pantalla de Login limpia sin StyleSheet repetitivos
├── App.tsx                   # Archivo de inicio del móvil
├── package.json              # Configuración y dependencias del proyecto
├── tsconfig.json             # Configuración del compilador TypeScript
└── app.json                  # Configuración nativa de Expo
```

---

## 🎨 Paleta de Colores Aplicada (Según la imagen)

Configuramos las variables de tu tema con los colores exactos solicitados:
*   `yaleBlue` (`#284B63`): Utilizado en el botón primario de inicio de sesión y títulos.
*   `stormyTeal` (`#3C6E71`): Usado en links, switches de "Recordarme" y botones secundarios.
*   `graphite` (`#353535`): Texto principal del cuerpo y etiquetas de formulario.
*   `alabasterGrey` (`#D9D9D9`): Bordes de cajas de texto, líneas de separación y estados deshabilitados.
*   `white` (`#FFFFFF`): Fondos de tarjetas y del botón secundario.
*   `background` (`#F5F7FA`): Fondo gris suave para las pantallas del celular.

---

## 🧪 Próximos Pasos para Ejecutar Localmente

Para iniciar tu servidor de desarrollo de Expo localmente en tu terminal de PowerShell, ejecuta el comando de NPM:

```powershell
# Iniciar servidor Expo (Metro)
npm run start
```

Una vez que se inicie, podrás:
*   Presionar `w` para abrirlo en el navegador web.
*   Escanear el código QR que aparecerá en pantalla con la aplicación **Expo Go** en tu celular (iOS o Android) para probarlo directamente en tu dispositivo físico en tiempo real.
