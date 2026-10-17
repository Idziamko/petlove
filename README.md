# Petlove

A pet adoption website with pet listings, animal news, partner organisations and a personal profile.

## Links

- Repository: https://github.com/Idziamko/petlove
- Website: https://idziamko.github.io/petlove/
- Vercel: https://petlove-beryl.vercel.app/
- Design: https://www.figma.com/design/puMNfZVg4YI8UZoJ1QiLLi/Petlove
- API documentation: https://petlove.b.goit.study/api-docs/

## Technologies

React, TypeScript, Vite, React Router, Redux Toolkit, Axios, Formik and Yup. The interface uses CSS and Manrope. Icons are served from one SVG sprite and the large images are exported as WebP in 1x and 2x sizes for retina screens.

## Assignment

Built from the Petlove technical assignment and the general project acceptance criteria. Public pages include news search, server pagination, pet filters and partner contacts. Signed-in users can edit their profile, manage their pets, save favorite notices and view recently opened notices.

Forms use Formik and Yup. The responsive layout targets mobile screens from 320 px, tablet screens from 768 px and desktop screens from 1280 px. Profile and pet photos use direct image URLs supported by the API.

## Local setup

Use Node.js 22 or later.

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Pages

Home, News, Find pet, Our friends, Login, Registration, Profile and Add pet.

The application uses the Petlove API for authentication, news, pet listings, partner details and user data. The signed-in user, favorites, viewed notices and pets are kept in a Redux store that is cleared on logout together with the saved token.

## Deployment

Changes pushed to main are built and deployed to GitHub Pages. The connected Vercel project also deploys the same Vite build to the Vercel URL above. The GitHub Pages workflow sets the project base path and includes a fallback page for direct route links.
