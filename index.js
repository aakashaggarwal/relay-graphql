import DataLoader from 'dataloader';

import express from 'express';
import fetch from 'node-fetch';
import graphqlHTTP from 'express-graphql';
import schema from './schema';

const BASE_URL = 'https://titan-fury.practodev.com/content/v1';

function getJSONFromRelativeURL(relativeURL) {
  return fetch(`${BASE_URL}${relativeURL}`)
    .then(res => res.json());
}

function getProviders() {
  return getJSONFromRelativeURL('/providers/')
    .then(json => json.data);
}

function getProvider(id) {
  return getDataByURL(`/providers/${id}/?slug=true`);
}

function getEstablishment(id) {
  return getDataByURL(`/providers/${id}/establishments?slug=true`);
}


function getDataByURL(relativeURL) {
  return getJSONFromRelativeURL(relativeURL)
    .then(json => json.data);
}

const app = express();

app.use(graphqlHTTP(req => {
  const cacheMap = new Map();
  const providersLoader =
    new DataLoader(keys => Promise.all(keys.map(getProviders)), {cacheMap});
  const providerLoader =
    new DataLoader(keys => Promise.all(keys.map(getProvider)), {
      cacheKeyFn: key => `/providers/${key}/`,
      cacheMap,
    });
  const establishmentLoader =
    new DataLoader(keys => Promise.all(keys.map(getEstablishment)), {
      cacheKeyFn: key => `/establishments/${key}/`,
      cacheMap,
    });
  const providerByURLLoader =
    new DataLoader(keys => Promise.all(keys.map(getDataByURL)), {cacheMap});
  providerLoader.loadAll = providersLoader.load.bind(providersLoader, '__all__');
  providerLoader.loadByURL = providerByURLLoader.load.bind(providerByURLLoader);
  providerLoader.loadManyByURL =
    providerByURLLoader.loadMany.bind(providerByURLLoader);
  const loaders = {provider: providerLoader, establishment: establishmentLoader};
  return {
    context: {loaders},
    graphiql: true,
    schema,
  };
}));

app.listen(
  5000,
  () => console.log('GraphQL Server running at http://localhost:5000')
);
