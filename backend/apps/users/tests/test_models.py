from django.test import TestCase
from apps.users.models import User


class UserModelTest(TestCase):
    def test_create_user(self):
        user = User.objects.create_user(username='testuser', password='pass1234')
        self.assertEqual(user.username, 'testuser')
