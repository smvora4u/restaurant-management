import React from 'react';
import { SafeAreaView, Text, View, StyleSheet } from 'react-native';
import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink, gql, useQuery } from '@apollo/client';
import { StatusBar } from 'expo-status-bar';

const client = new ApolloClient({
  link: new HttpLink({ uri: 'http://localhost:4000/graphql' }),
  cache: new InMemoryCache(),
});

const HEALTH_QUERY = gql`
  query Health { 
    health { 
      ok 
      mongo 
    } 
  }
`;

interface HealthData {
  health: {
    ok: boolean;
    mongo: boolean;
  };
}

function Home(): JSX.Element {
  const { data, loading, error } = useQuery<HealthData>(HEALTH_QUERY);
  
  return (
    <View style={styles.container}>
      {loading && <Text>Loading...</Text>}
      {error && <Text>Error: {error.message}</Text>}
      {data && <Text>{JSON.stringify(data.health)}</Text>}
    </View>
  );
}

export default function App(): JSX.Element {
  return (
    <ApolloProvider client={client}>
      <SafeAreaView style={styles.safeArea}>
        <Home />
        <StatusBar style="auto" />
      </SafeAreaView>
    </ApolloProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 24,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});



