<script lang="ts" setup>
// Vue.js
import { computed, ref, watchEffect } from 'vue';

// Vue Router
import { useRouter } from 'vue-router';

// Stores
import { useAuthStore } from '@/stores/auth';
import { usePageStore } from '@/stores/page';

// Amplify - Auth
import { fetchAuthSession, fetchUserAttributes, signOut } from 'aws-amplify/auth';

// Amplify - Utilities
import { Hub } from 'aws-amplify/utils';

// Quasar
import { useMeta, useQuasar } from 'quasar';

// Feedback Dialog
import FeedbackDialog from '@/components/FeedbackDialog.vue';

// Google Sign In
import GoogleSignIn from '@/components/GoogleSignIn.vue';

// Tune Dialog
import TuneDialog from '@/components/TuneDialog.vue';

// get stores
const auth = useAuthStore();
const page = usePageStore();

// get the $router object
const $router = useRouter();

// the current route
const currentRoute = computed(() => $router.resolve(location.pathname + location.search + location.hash));

// the route key
const routeKey = computed(() => [currentRoute.value.fullPath, history.state.position].join());

// get the $q object
const $q = useQuasar();

// set dark mode status
$q.dark.set(page.dark);

// watch dark mode status
watchEffect(() => (page.dark = $q.dark.mode));

// use meta
useMeta({
  titleTemplate: (title) => `${title} - ChipTube`,
  meta: {
    description: {
      name: 'description',
    },
  },
});

// the previous page
const previousPage = ref<string>();

// the drawer behavior
const drawerBehavior = computed(() => {
  const { name } = currentRoute.value;
  if (name === 'watch') {
    return 'mobile';
  }
});

// the drawer state
const drawer = ref(false);

// is searching
const isSearching = ref(false);

// the search query
const query = ref('');

// watch current route
watchEffect(() => {
  const { name, query: { q } } = currentRoute.value;
  if (name === 'search' && typeof q === 'string') {
    query.value = q;
  }

  // show search input if current route is "search"
  isSearching.value = name === 'search';
});

// search
const search = async () => {
  if (query.value) {
    await $router.push({ name: 'search', query: { q: query.value } });
  }
};

// subscribe auth events
Hub.listen('auth', ({ payload }) => {
  switch (payload.event) {
    case 'signInWithRedirect':
    case 'signInWithRedirect_failure':
      $router.replace({});
      break;
    case 'customOAuthState':
      previousPage.value = payload.data;
      break;
  }
});

// is loading
const isLoading = ref(true);

// get the current user
(async () => {
  try {
    // fetch the auth session
    await fetchAuthSession();

    // start fetching user attributes
    const done = fetchUserAttributes().then((user) => (auth.user = user)).catch(() => (auth.user = null));

    // wait for fetch user attributes if the auth user not exists
    if (auth.user === null) {
      await done;
    }
  } catch {
    auth.user = null;
  } finally {
    // redirect to previous page if it exists
    if (previousPage.value) {
      await $router.replace(previousPage.value);
    }

    // stop loading
    isLoading.value = false;
  }
})();
</script>

<template>
  <q-layout view="hHh LpR fFf">
    <q-header>
      <q-toolbar>
        <template v-if="$q.screen.gt.xs || !isSearching">
          <q-btn flat round @click="drawer = !drawer">
            <q-icon name="mdi-menu" />
          </q-btn>
          <q-toolbar-title shrink>
            <router-link :to="{ name: 'index' }">
              ChipTube
            </router-link>
          </q-toolbar-title>
          <q-space />
        </template>
        <template v-if="$q.screen.gt.xs || isSearching">
          <q-input v-model="query" class="col-grow" dense outlined placeholder="Search" square @keyup.enter="search">
            <template v-if="$q.screen.lt.sm && isSearching" #before>
              <q-btn flat round @click="isSearching = false">
                <q-icon name="mdi-arrow-left" />
              </q-btn>
            </template>
            <template #after>
              <q-btn flat round @click="search">
                <q-icon name="mdi-magnify" />
              </q-btn>
            </template>
          </q-input>
        </template>
        <template v-if="$q.screen.gt.xs || !isSearching">
          <q-space />
          <div class="row no-wrap items-center" :class="$q.screen.lt.sm ? 'q-gutter-sm' : 'q-gutter-md'">
            <template v-if="!isLoading">
              <template v-if="$q.screen.lt.sm && !isSearching">
                <q-btn flat round @click="isSearching = true">
                  <q-icon name="mdi-magnify" />
                </q-btn>
              </template>
              <template v-if="auth.user">
                <q-btn flat round @click="$q.dialog({ component: TuneDialog })">
                  <q-icon name="mdi-music-note-plus" />
                </q-btn>
              </template>
              <q-btn flat round>
                <template v-if="auth.user">
                  <q-avatar>
                    <img :src="auth.user.picture" referrerpolicy="no-referrer">
                  </q-avatar>
                </template>
                <template v-else>
                  <q-icon name="mdi-dots-vertical" />
                </template>
                <q-menu class="full-width no-shadow" anchor="bottom right" max-width="300px" self="top right" square>
                  <q-list bordered dense padding>
                    <template v-if="auth.user">
                      <q-item>
                        <q-item-section avatar>
                          <q-avatar>
                            <img :src="auth.user.picture" referrerpolicy="no-referrer">
                          </q-avatar>
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>
                            {{ auth.user.nickname }}
                          </q-item-label>
                          <q-item-label>
                            {{ auth.user.email }}
                          </q-item-label>
                        </q-item-section>
                      </q-item>
                      <q-separator spaced />
                      <q-item clickable v-close-popup @click="signOut()">
                        <q-item-section side>
                          <q-icon name="mdi-logout" />
                        </q-item-section>
                        <q-item-section>
                          Sign out
                        </q-item-section>
                      </q-item>
                      <q-separator spaced />
                    </template>
                    <q-item clickable>
                      <q-item-section side>
                        <q-icon name="mdi-theme-light-dark" />
                      </q-item-section>
                      <q-item-section>
                        <template v-if="page.dark === 'auto'">
                          Appearance: Device theme
                        </template>
                        <template v-if="page.dark === true">
                          Appearance: Dark
                        </template>
                        <template v-if="page.dark === false">
                          Appearance: Light
                        </template>
                      </q-item-section>
                      <q-item-section side>
                        <q-icon name="mdi-chevron-right" />
                      </q-item-section>
                      <q-menu class="no-shadow" anchor="top right" :offset="[1.33125, 9]" self="top right" square>
                        <q-list bordered dense padding>
                          <q-item-label caption header>
                            Setting applies to this browser only
                          </q-item-label>
                          <q-item clickable v-close-popup @click="$q.dark.set('auto')">
                            <q-item-section side>
                              <q-icon :class="{ invisible: !(page.dark === 'auto') }" name="mdi-check" />
                            </q-item-section>
                            <q-item-section>
                              Use device theme
                            </q-item-section>
                          </q-item>
                          <q-item clickable v-close-popup @click="$q.dark.set(true)">
                            <q-item-section side>
                              <q-icon :class="{ invisible: !(page.dark === true) }" name="mdi-check" />
                            </q-item-section>
                            <q-item-section>
                              Dark theme
                            </q-item-section>
                          </q-item>
                          <q-item clickable v-close-popup @click="$q.dark.set(false)">
                            <q-item-section side>
                              <q-icon :class="{ invisible: !(page.dark === false) }" name="mdi-check" />
                            </q-item-section>
                            <q-item-section>
                              Light theme
                            </q-item-section>
                          </q-item>
                        </q-list>
                      </q-menu>
                    </q-item>
                    <q-separator spaced />
                    <q-item active-class="" :to="{ name: 'settings' }">
                      <q-item-section side>
                        <q-icon name="mdi-cog-outline" />
                      </q-item-section>
                      <q-item-section>
                        Settings
                      </q-item-section>
                    </q-item>
                    <q-separator spaced />
                    <q-item disable>
                      <q-item-section side>
                        <q-icon name="mdi-help-circle-outline" />
                      </q-item-section>
                      <q-item-section>
                        Help
                      </q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="$q.dialog({ component: FeedbackDialog })">
                      <q-item-section side>
                        <q-icon name="mdi-message-alert-outline" />
                      </q-item-section>
                      <q-item-section>
                        Send feedback
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
              <template v-if="auth.user === null">
                <google-sign-in class="q-ml-md" />
              </template>
            </template>
            <template v-else>
              <q-avatar v-for="_ in $q.screen.lt.sm ? 3 : 2" size="42px">
                <q-skeleton animation="none" type="QAvatar" />
              </q-avatar>
            </template>
          </div>
        </template>
      </q-toolbar>
    </q-header>
    <q-drawer v-model="drawer" :behavior="drawerBehavior" :persistent="$q.screen.gt.sm" show-if-above :width="240">
      <div class="column full-height">
        <q-toolbar v-if="drawerBehavior === 'mobile' || $q.screen.lt.md">
          <q-btn flat round @click="drawer = !drawer">
            <q-icon name="mdi-menu" />
          </q-btn>
          <q-toolbar-title shrink>
            <router-link :to="{ name: 'index' }">
              ChipTube
            </router-link>
          </q-toolbar-title>
        </q-toolbar>
        <q-scroll-area v-if="!isLoading" class="col-grow">
          <q-list dense padding>
            <q-item :active-class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-4'" :to="{ name: 'index' }" v-ripple>
              <q-item-section side>
                <q-icon name="mdi-home-variant" />
              </q-item-section>
              <q-item-section>
                Home
              </q-item-section>
            </q-item>
            <q-item disable v-ripple>
              <q-item-section side>
                <q-icon name="mdi-youtube-subscription" />
              </q-item-section>
              <q-item-section>
                Subscriptions
              </q-item-section>
            </q-item>
            <q-item :active-class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-4'" :to="{ name: 'playground' }" v-ripple>
              <q-item-section side>
                <q-icon name="mdi-pinwheel-outline" />
              </q-item-section>
              <q-item-section>
                Playground
              </q-item-section>
            </q-item>
            <q-separator spaced />
            <template v-if="auth.user">
              <q-item :active-class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-4'" style="height: 40px;" :to="{ name: 'users-id', params: { id: auth.user.sub } }" v-ripple>
                <q-item-section>
                  <div class="row q-gutter-sm">
                    <div>
                      You
                    </div>
                    <div>
                      <q-icon name="mdi-chevron-right" />
                    </div>
                  </div>
                </q-item-section>
              </q-item>
            </template>
            <q-item disable v-ripple>
              <q-item-section side>
                <q-icon name="mdi-music-box-multiple-outline" />
              </q-item-section>
              <q-item-section>
                Library
              </q-item-section>
            </q-item>
            <q-item disable v-ripple>
              <q-item-section side>
                <q-icon name="mdi-history" />
              </q-item-section>
              <q-item-section>
                History
              </q-item-section>
            </q-item>
            <template v-if="auth.user">
              <q-item :active-class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-4'" :to="{ name: 'likes' }" v-ripple>
                <q-item-section side>
                  <q-icon name="mdi-thumb-up-outline" />
                </q-item-section>
                <q-item-section>
                  Liked tunes
                </q-item-section>
              </q-item>
              <q-separator spaced />
            </template>
            <template v-else>
              <q-separator spaced />
              <q-item>
                <q-item-section class="q-gutter-sm">
                  <div class="q-px-sm">
                    Sign in to like tunes, comment, and subscribe.
                  </div>
                  <div class="q-px-sm">
                    <google-sign-in />
                  </div>
                </q-item-section>
              </q-item>
              <q-separator spaced />
            </template>
            <q-item :active-class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-4'" :to="{ name: 'settings' }" v-ripple>
              <q-item-section side>
                <q-icon name="mdi-cog-outline" />
              </q-item-section>
              <q-item-section>
                Settings
              </q-item-section>
            </q-item>
            <q-item disable v-ripple>
              <q-item-section side>
                <q-icon name="mdi-flag-outline" />
              </q-item-section>
              <q-item-section>
                Report history
              </q-item-section>
            </q-item>
            <q-item disable v-ripple>
              <q-item-section side>
                <q-icon name="mdi-help-circle-outline" />
              </q-item-section>
              <q-item-section>
                Help
              </q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="$q.dialog({ component: FeedbackDialog })">
              <q-item-section side>
                <q-icon name="mdi-message-alert-outline" />
              </q-item-section>
              <q-item-section>
                Send feedback
              </q-item-section>
            </q-item>
            <q-separator spaced />
            <q-item-label header>
              Others
            </q-item-label>
            <q-item href="https://github.com/malvaceae/chiptube" target="_blank" v-ripple>
              <q-item-section side>
                <q-icon name="mdi-github" />
              </q-item-section>
              <q-item-section>
                GitHub
              </q-item-section>
            </q-item>
            <q-separator spaced />
            <q-item-label class="row q-gutter-sm" caption>
              <div>
                ChipTube is a web service for play and share MIDI files.
              </div>
              <div class="text-grey-6">
                &copy; {{ new Date().getFullYear() }} chiptu.be
              </div>
            </q-item-label>
          </q-list>
        </q-scroll-area>
      </div>
    </q-drawer>
    <q-page-container>
      <router-view v-if="!isLoading" #default="{ Component }">
        <keep-alive exclude="playground,settings,watch" max="1">
          <component :is="Component" :key="routeKey" />
        </keep-alive>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<style lang="scss" scoped>
.body--light {
  .q-layout {
    background-color: $grey-1;
  }

  .q-header {
    background-color: #fff;
  }

  .q-toolbar {
    color: $grey-8;
  }
}

.body--dark {
  .q-header {
    background-color: $dark;
  }
}

.q-menu .q-list .q-item {
  padding: 8px 16px;
}

.q-menu .q-list .q-item__label--header {
  padding: 5px 16px 13px;
}

.q-drawer .q-list .q-item {
  padding: 8px 25px;

  .q-item__section--side {
    padding-right: 25px;
  }
}

.q-drawer .q-list .q-item__label--caption,
.q-drawer .q-list .q-item__label--header {
  padding: 8px 25px 16px;
}

a {
  color: inherit;
  text-decoration: none;
}
</style>
