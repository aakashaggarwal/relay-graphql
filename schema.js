import fetch from 'node-fetch';
import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import {
  fromGlobalId,
  globalIdField,
  nodeDefinitions,
} from 'graphql-relay';


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

const {
  nodeField,
  nodeInterface,
} = nodeDefinitions(
  // A method that maps from a global id to an object
  (globalId, {loaders}) => {
    const {id, type} = fromGlobalId(globalId);
    if (type === 'Provider') {
      return loaders.provider.load(id);
    }
    if (type === 'Establishment') {
      return loaders.establishment.load(id);
    }
  },
  // A method that maps from an object to a type
  (obj) => {
    console.log(obj)
    if (obj.hasOwnProperty('username')) {
      return ProviderType;
    }
  }
);


const ProviderType = new GraphQLObjectType({
  name: 'Provider',
  description: 'All Doctors',
  fields: () => ({
    id: globalIdField('Provider'),
    firstName: {
      type: GraphQLString,
      description: 'Doctor First Name',
      resolve: obj => obj.name.first_name,
    },
    lastName: {
      type: GraphQLString,
      description: 'Doctor Last Name',
      resolve: obj => obj.name.last_name,
    },
    slug: {
      type: GraphQLString,
      description: 'Doctor Slug',
      resolve: obj => obj.slug,
    },
    fullName: {
      type: GraphQLString,
      description: 'A doctor name sandwich',
      resolve: obj => `${obj.name.first_name} ${obj.name.last_name}`,
    },
    establishments: {
      type: new GraphQLList(EstablishmentType),
      description: 'Clinics where doctor works',
      resolve: (provider) =>
        getEstablishment(provider.slug)
    },
  }),
  interfaces: [nodeInterface],
});

const EstablishmentType = new GraphQLObjectType({
  name: 'Establishment',
  description: 'All Establishments',
  fields: () => ({
    id: globalIdField('Establishment'),
    firstName: {
      type: GraphQLString,
      description: 'Establishment First Name',
      resolve: obj => obj.establishment.name,
    }
  }),
  interfaces: [nodeInterface],
});

const QueryType = new GraphQLObjectType({
  name: 'Query',
  description: 'The root of all... queries',
  fields: () => ({
    allProviders: {
      type: new GraphQLList(ProviderType),
      description: 'Everyone, everywhere',
      resolve: (root, args, {loaders}) => loaders.provider.loadAll(),
    },
    node: nodeField,
    provider: {
      type: ProviderType,
      args: {
        id: {type: new GraphQLNonNull(GraphQLID)},
      },
      resolve: (root, args, {loaders}) => loaders.provider.load(args.id),
    },
    establishment: {
      type: EstablishmentType,
      args: {
        id: {type: new GraphQLNonNull(GraphQLID)},
      },
      resolve: (root, args, {loaders}) => loaders.establishment.load(args.id),
    },
  }),
});

export default new GraphQLSchema({
  query: QueryType,
});
