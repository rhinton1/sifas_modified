from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from apps.users.models import User


class MeViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass1234')
        self.client.force_authenticate(user=self.user)

    def test_get_me(self):
        url = reverse('user-me')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
