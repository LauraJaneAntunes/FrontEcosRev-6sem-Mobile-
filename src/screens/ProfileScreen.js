import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, Modal, Alert, Animated } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useFontSettings } from '../contexts/FontContext';
import { useAuth } from '../contexts/AuthContext';
import { IconButton } from 'react-native-paper';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import CustomAlert from '../components/CustomAlert';
import PasswordModal from '../components/PasswordModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';


export default function ProfileScreen() {
  const navigation = useNavigation();
   const { logout } = useAuth();
  const theme = useTheme();
  const { fontSize } = useFontSettings(); const [userData, setUserData] = useState({
    _id: '',
    nome: '',
    email: '',
    cpf: '',
    celular: '',
    endereco: '',
    profileImage: '',
    pontos: 0,
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editModal, setEditModal] = useState({ visible: false, field: '', value: '' });
  const [addressForm, setAddressForm] = useState({ logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '' });
  const [bioEditing, setBioEditing] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [modalAnim] = useState(new Animated.Value(0));
  // Estados para os CustomAlerts
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: () => { },
    onCancel: () => { },
    confirmColor: '',
    showCancelButton: true,
  });

  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
      fetchUserPoints();
    }, [])
  );

  const fetchUserPoints = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await api.get(`/usuario/pontos`, {
        headers: { "access-token": token }
      });

      if (response.data && response.data.length > 0) {
        setUserData(prevData => ({
          ...prevData,
          pontos: response.data[0].pontos
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar pontos do usuário:", error);
    }
  };
  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.get(`/usuario/me`, {
        headers: {
          'Content-Type': 'application/json',
          'access-token': token
        },
      });

      const data = response.data;
      const user = Array.isArray(data.results) ? data.results[0] : data; // adapte se a estrutura do retorno for diferente

      setUserData(prevData => ({
        ...prevData,
        _id: user._id,
        nome: user.nome || user.fullName || '',
        email: user.email || '',
        cpf: user.cpf || '',
        celular: user.celular || user.telefone || '',
        endereco: user.endereco || user.localizacao || '',
        profileImage: user.profileImage || 'https://randomuser.me/api/portraits/lego/1.jpg',
      }));
      // Prioriza imagem salva localmente enquanto não há BD
      try {
        const stored = await AsyncStorage.getItem('profileImage');
        if (stored) setUserData(prev => ({ ...prev, profileImage: stored }));
      } catch (err) {
        console.error('Erro ao ler profileImage do AsyncStorage:', err);
      }
    } catch (error) {
      console.error('Erro ao obter os dados do usuário:', error);
      setUserData({
        _id: "",
        nome: "",
        email: "",
        profileImage: "",
        pontos: 0,
      });
      showAlert({
        title: 'Erro',
        message: 'Não foi possível carregar os dados do perfil.',
        confirmText: 'OK',
        confirmColor: theme.colors.error,
        showCancelButton: false,
      });
    } finally {
      // garantir que, qualquer que seja o resultado da chamada ao backend,
      // se o usuário tiver uma imagem salva localmente ela seja usada.
      try {
        const stored = await AsyncStorage.getItem('profileImage');
        if (stored) {
          setUserData(prev => ({ ...prev, profileImage: stored }));
        }
      } catch (err) {
        console.error('Erro ao recuperar profileImage no finally:', err);
      }
      setIsLoading(false);
    }
  };

  // Função genérica para mostrar alertas, com controle de botão único e callback de cancelamento
  const showAlert = ({
    title,
    message,
    confirmText = 'OK',
    cancelText = 'Cancelar',
    onConfirm = () => { },
    onCancel = () => { },
    confirmColor = theme.colors.primary,
    showCancelButton = true
  }) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      confirmText,
      cancelText,
      confirmColor,
      showCancelButton,
      onConfirm: () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        onConfirm();
      }, onCancel: () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        if (onCancel) onCancel();
      }
    });
  };

  // Máscaras e utilitários simples
  const formatCPF = (cpf = '') => {
    const digits = (cpf + '').replace(/\D/g, '').slice(0, 11);
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, (m, a, b, c, d) => `${a}.${b}.${c}-${d}`) || digits.replace(/(\d{3})(\d{3})(\d{3})/, (m, a, b, c) => `${a}.${b}.${c}`) || digits;
  };

  const formatPhone = (phone = '') => {
    const digits = (phone + '').replace(/\D/g, '').slice(0, 13);
    // formato aproximado brasileiro: +55 XX XXXXX-XXXX ou (XX) XXXXX-XXXX
    if (digits.startsWith('55') && digits.length > 2) {
      const withoutDDI = digits.slice(2);
      if (withoutDDI.length <= 2) return `+55 ${withoutDDI}`;
      if (withoutDDI.length <= 6) return `+55 (${withoutDDI.slice(0, 2)}) ${withoutDDI.slice(2)}`;
      if (withoutDDI.length <= 10) return `+55 (${withoutDDI.slice(0, 2)}) ${withoutDDI.slice(2, 7)}-${withoutDDI.slice(7)}`;
    }
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return digits;
  };

  const unformat = (value = '') => (value + '').replace(/\D/g, '');

  // Validações simples
  const validateEmail = (email = '') => /\S+@\S+\.\S+/.test(email);
  const validatePhone = (phone = '') => {
    const d = unformat(phone);
    return d.length >= 10 && d.length <= 13; // aceita DDD + 8-9 dígitos, opcional +55
  };
  const validateCEP = (cep = '') => {
    const d = (cep + '').replace(/\D/g, '');
    return d.length === 8;
  };

  // Heurística simples para decompor um endereco livre em campos
  const parseAddress = (endereco = '') => {
    // tenta dividir por separadores comuns: ',' ou ' - '
    if (!endereco) return { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '' };
    // Remove 'CEP:' se existir
    const cepMatch = endereco.match(/CEP[:]?\s*(\d{5}-?\d{3})/i);
    const cep = cepMatch ? cepMatch[1].replace(/\D/g, '') : '';
    let main = endereco.replace(/CEP[:]?\s*(\d{5}-?\d{3})/i, '');
    // separar por ' - ' preferencialmente
    const parts = main.split(' - ').map(p => p.trim()).filter(Boolean);
    let logradouro = parts[0] || '';
    let numero = '';
    // se logradouro contem virgula, tenta separar numero
    if (logradouro && logradouro.includes(',')) {
      const [l, n, ...rest] = logradouro.split(',').map(s => s.trim());
      logradouro = l || '';
      numero = n || '';
      if (rest.length) parts.splice(0, 1, rest.join(' '));
    }
    const complemento = parts[1] || '';
    const bairro = parts[2] || '';
    const cidade = parts[3] || '';
    const estado = parts[4] || '';
    return { logradouro, numero, complemento, bairro, cidade, estado, cep };
  };

  const openEditModal = (field) => {
    if (field === 'endereco') {
      // tentar decompor endereco existente
      const parsed = parseAddress(userData.endereco || '');
      setAddressForm(parsed);
      setEditModal({ visible: true, field, value: userData.endereco || '' });
      setBioEditing(userData.bio || '');
    } else if (field === 'bio') {
      setBioEditing(userData.bio || '');
      setEditModal({ visible: true, field, value: userData.bio || '' });
    } else {
      setEditModal({ visible: true, field, value: userData[field] || '' });
    }
    // iniciar animação de entrada do modal
    Animated.spring(modalAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 40 }).start();
  };

  const changeProfilePhoto = () => {
    pickImage();
  };

  // animação para esconder modal quando fechar
  useEffect(() => {
    if (!editModal.visible) {
      Animated.timing(modalAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    }
  }, [editModal.visible]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert({ title: 'Permissão', message: 'Permissão para acessar fotos negada.', confirmColor: theme.colors.error, showCancelButton: false });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      // compatibilidade com novas versões do expo-image-picker (assets array)
      const uri = result.assets && result.assets[0] ? result.assets[0].uri : result.uri;
      if (!result.canceled && uri) {
        // atualiza localmente
        setUserData(prev => ({ ...prev, profileImage: uri }));
        // salvar localmente no AsyncStorage enquanto não há backend persistente
        try {
          await AsyncStorage.setItem('profileImage', uri);
          // confirmar que foi gravado
          const verify = await AsyncStorage.getItem('profileImage');
          if (verify !== uri) {
            console.warn('profileImage gravado, mas leitura retornou diferente:', verify);
            showAlert({ title: 'Aviso', message: 'Não foi possível confirmar salvamento local da imagem.', confirmColor: theme.colors.warning, showCancelButton: false });
          }
        } catch (err) {
          console.error('Erro ao salvar imagem no AsyncStorage:', err);
          showAlert({ title: 'Erro', message: 'Não foi possível salvar a imagem localmente.', confirmColor: theme.colors.error, showCancelButton: false });
          return;
        }
        // tenta enviar para backend (multipart/form-data) - preferível para arquivos
        try {
          const token = await AsyncStorage.getItem('token');
          if (token) {
            const userId = userData._id;
            const url = userId ? `/usuario/${userId}` : `/usuario/me`;
            const formData = new FormData();
            formData.append('profileImage', { uri, name: 'profile.jpg', type: 'image/jpeg' });
            await api.put(url, formData, { headers: { 'Content-Type': 'multipart/form-data', 'access-token': token } });
            showAlert({ title: 'Sucesso', message: 'Foto atualizada e enviada ao servidor.', confirmColor: theme.colors.success, showCancelButton: false });
          } else {
            showAlert({ title: 'Sucesso', message: 'Foto salva localmente. Faça login para sincronizar com o servidor mais tarde.', confirmColor: theme.colors.info, showCancelButton: false });
          }
        } catch (err) {
          console.error('Erro ao enviar foto para backend (multipart):', err);
          // fallback para enviar apenas URI no body
          try {
            const token = await AsyncStorage.getItem('token');
            if (token) {
              const userId = userData._id;
              const url = userId ? `/usuario/${userId}` : `/usuario/me`;
              await api.put(url, { profileImage: uri }, { headers: { 'access-token': token } });
              showAlert({ title: 'Sucesso', message: 'Foto atualizada (URI enviada).', confirmColor: theme.colors.success, showCancelButton: false });
            }
          } catch (err2) {
            console.error('Fallback envio URI erro:', err2);
            // Se chegou aqui, a imagem já foi salva localmente (verificação feita), então apenas avisa que a sincronização falhou
            showAlert({ title: 'Aviso', message: 'Foto salva localmente, mas não foi possível enviar ao servidor.', confirmColor: theme.colors.warning, showCancelButton: false });
          }
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      showAlert({ title: 'Erro', message: 'Não foi possível selecionar a imagem.', confirmColor: theme.colors.error, showCancelButton: false });
    }
  };

  // Consulta ViaCEP (API pública) para autocompletar endereço por CEP
  const fetchAddressByCEP = async (cep) => {
    const clean = (cep || '').replace(/\D/g, '');
    if (clean.length !== 8) {
      showAlert({ title: 'CEP inválido', message: 'Informe um CEP com 8 dígitos para buscar.', confirmColor: theme.colors.error, showCancelButton: false });
      return;
    }
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const j = await resp.json();
      if (j.erro) throw new Error('CEP não encontrado');
      setAddressForm(prev => ({ ...prev, logradouro: j.logradouro || '', bairro: j.bairro || '', cidade: j.localidade || '', estado: j.uf || '' }));
      showAlert({ title: 'OK', message: 'Endereço preenchido a partir do CEP.', confirmColor: theme.colors.success, showCancelButton: false });
    } catch (error) {
      console.error('ViaCEP erro', error);
      showAlert({ title: 'Erro', message: 'Não foi possível buscar o CEP.', confirmColor: theme.colors.error, showCancelButton: false });
    }
  };

  const closeEditModal = () => setEditModal({ visible: false, field: '', value: '' });

  const handleSaveField = async () => {
    const { field, value } = editModal;
    if (!field) return;
    // prepara payload
    let payload = {};
    if (field === 'cpf') payload.cpf = unformat(value);
    else if (field === 'celular') payload.celular = unformat(value);
    else if (field === 'nome') payload.nome = value;
    else if (field === 'email') payload.email = value;
    else if (field === 'endereco') payload.endereco = value;
  else if (field === 'bio') payload.bio = bioEditing || value;
    // Validações
    if (field === 'email' && !validateEmail(value)) {
      showAlert({ title: 'Email inválido', message: 'Por favor verifique o email informado.', confirmColor: theme.colors.error, showCancelButton: false });
      return;
    }
    if (field === 'celular' && !validatePhone(value)) {
      showAlert({ title: 'Celular inválido', message: 'Por favor informe um número de celular válido.', confirmColor: theme.colors.error, showCancelButton: false });
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Token não encontrado');

      const userId = userData._id;
      const url = userId ? `/usuario/${userId}` : `/usuario/me`;
      const response = await api.put(url, payload, { headers: { 'access-token': token } });

      // atualiza estado local com a resposta ou otimisticamente com payload
      setUserData(prev => ({ ...prev, ...payload }));
      showAlert({ title: 'Sucesso', message: 'Dados atualizados com sucesso.', confirmColor: theme.colors.success || theme.colors.primary, showCancelButton: false });
      closeEditModal();
    } catch (error) {
      console.error('Erro ao salvar campo:', error);
      showAlert({ title: 'Erro', message: 'Não foi possível salvar. Tente novamente.', confirmColor: theme.colors.error, showCancelButton: false });
    }
  };

  const handleSaveAddress = async () => {
    // montar endereco simples a partir do formulário
    const { logradouro, numero, complemento, bairro, cidade, estado, cep } = addressForm;
    const enderecoConstruido = `${logradouro}${numero ? ', ' + numero : ''}${complemento ? ' - ' + complemento : ''}${bairro ? ' - ' + bairro : ''}${cidade ? ' - ' + cidade : ''}${estado ? ' - ' + estado : ''}${cep ? ' - CEP: ' + cep : ''}`;
    // Valida CEP se preenchido
    if (cep && !validateCEP(cep)) {
      showAlert({ title: 'CEP inválido', message: 'Por favor informe um CEP com 8 dígitos.', confirmColor: theme.colors.error, showCancelButton: false });
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Token não encontrado');
      const userId = userData._id;
      const url = userId ? `/usuario/${userId}` : `/usuario/me`;
      await api.put(url, { endereco: enderecoConstruido }, { headers: { 'access-token': token } });
      setUserData(prev => ({ ...prev, endereco: enderecoConstruido }));
  // também atualiza bio se existia no formulário
  if (bioEditing) setUserData(prev => ({ ...prev, bio: bioEditing }));
      showAlert({ title: 'Sucesso', message: 'Endereço atualizado.', confirmColor: theme.colors.success || theme.colors.primary, showCancelButton: false });
      closeEditModal();
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
      showAlert({ title: 'Erro', message: 'Não foi possível salvar o endereço. Tente novamente.', confirmColor: theme.colors.error, showCancelButton: false });
    }
  };

  const handleLogout = () => {
    showAlert({
      title: 'Confirmar Saída',
      message: 'Tem certeza que deseja sair da conta?',
      confirmText: 'Sair',
      cancelText: 'Cancelar',
      confirmColor: theme.colors.error,
      showCancelButton: true,
      onConfirm: async () => {
        try {
        
          // Usar o método logout do AuthContext
          await logout();
          // Remover dados adicionais
          await AsyncStorage.removeItem('user');
        } catch (error) {
          console.error('Erro ao remover token:', error);
        }
      },
    });
  };

  const handleDeleteAccount = async () => {
    // Verifica se o usuário tem pontos
    if (userData.pontos > 0) {
      showAlert({
        title: 'Atenção',
        message: `Você ainda possui ${userData.pontos} pontos. Deseja trocar seus pontos por benefícios antes de apagar sua conta?`,
        confirmText: 'Trocar Pontos',
        cancelText: 'Apagar Mesmo Assim',
        confirmColor: theme.colors.primary,
        showCancelButton: true,
        onConfirm: () => {
          // Navega para a tela de benefícios para trocar os pontos
          navigation.navigate('Main', { screen: 'BenefitsTab' });
        },
        onCancel: () => {
          // Prossegue com a exclusão mesmo tendo pontos
          confirmDeleteAccount();
        }
      });
    } else {
      // Se não tem pontos, apenas pergunta se tem certeza
      confirmDeleteAccount();
    }
  };

  const confirmDeleteAccount = () => {
    showAlert({
      title: 'Apagar Conta',
      message: 'Tem certeza que deseja apagar sua conta? Esta ação não pode ser desfeita.',
      confirmText: 'Apagar',
      cancelText: 'Cancelar',
      confirmColor: theme.colors.error,
      showCancelButton: true,
      onConfirm: async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          if (!token) return;

          // Obtem o ID do usuário do token
          const userId = userData._id;

          // Faz a requisição DELETE para apagar a conta
          await api.delete(`/usuario/${userId}`, {
            headers: { "access-token": token }
          });

          // Remove o token e navega para a tela de login
          await AsyncStorage.removeItem('token');
          showAlert({
            title: 'Sucesso',
            message: 'Sua conta foi apagada com sucesso.',
            confirmText: 'OK',
            confirmColor: theme.colors.success || theme.colors.primary,
            showCancelButton: false,
            onConfirm: () => {
              navigation.navigate('Login');
            }
          });
        } catch (error) {
          console.error('Erro ao apagar conta:', error);
          showAlert({
            title: 'Erro',
            message: 'Não foi possível apagar sua conta. Tente novamente mais tarde.',
            confirmText: 'OK',
            confirmColor: theme.colors.error,
            showCancelButton: false
          });
        }
      }
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      style={{ backgroundColor: theme.colors.background }}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
          <View style={styles.headerTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.imageWrapper}>
                {isLoading ? (
                  <View style={[styles.userImagePlaceholder, { backgroundColor: theme.colors.border }]} />
                ) : userData.profileImage ? (
                  <Image source={{ uri: userData.profileImage }} style={styles.userImage} />
                ) : (
                  <View style={[styles.userImagePlaceholder, { backgroundColor: theme.colors.primary }] }>
                    <FontAwesome6 name="user" size={60} color={theme.colors.text.inverse} />
                  </View>
                )}
                <TouchableOpacity onPress={changeProfilePhoto} style={[styles.cameraBadge, { backgroundColor: theme.colors.primary }] }>
                  <FontAwesome6 name="camera" size={18} color={theme.colors.text.inverse} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={[styles.nameText, { color: theme.colors.text.primary, fontSize: fontSize.lg }]}> 
              {userData.nome || 'Usuário'}
            </Text>
            <Text style={[styles.subtitleText, { color: theme.colors.text.secondary, fontSize: fontSize.sm }]}>Desenvolvedora apaixonada por tecnologia e inovação.</Text>
            <View style={styles.pointsContainer}>
              <Text style={[styles.pointsNumber, { color: theme.colors.primary, fontSize: fontSize.xl || fontSize.lg + 4 }]}>{userData.pontos || 0}</Text>
              <Text style={[styles.pointsLabel, { color: theme.colors.text.secondary, fontSize: fontSize.md }]}>Pontos</Text>
            </View>
            <TouchableOpacity style={[styles.editProfileButton, { backgroundColor: theme.colors.primary }]} onPress={() => openEditModal('bio')}>
              <FontAwesome6 name="pen" size={16} color={theme.colors.text.inverse} />
              <Text style={[styles.editProfileText, { color: theme.colors.text.inverse, fontSize: fontSize.md }]}>  Editar Perfil</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.infoSection, { marginTop: 10 }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary, fontSize: fontSize.lg }]}>Informações Pessoais</Text>

          {/* Nome Completo */}
          <View style={[styles.infoRow, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="account" size={18} color={theme.colors.text.inverse} />
            </View>
            <View style={styles.infoTexts}>
              <Text style={[styles.infoLabel, { color: theme.colors.text.secondary, fontSize: fontSize.sm }]}>Nome Completo</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text.primary, fontSize: fontSize.md }]}>{userData.nome || ''}</Text>
            </View>
            <IconButton icon="pencil" size={18} iconColor={theme.colors.text.secondary} onPress={() => openEditModal('nome')} />
          </View>

          {/* CPF */}
          <View style={[styles.infoRow, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="card-account-details" size={18} color={theme.colors.text.inverse} />
            </View>
            <View style={styles.infoTexts}>
              <Text style={[styles.infoLabel, { color: theme.colors.text.secondary, fontSize: fontSize.sm }]}>CPF</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text.primary, fontSize: fontSize.md }]}>{formatCPF(userData.cpf || '')}</Text>
            </View>
            <IconButton icon="information" size={18} iconColor={theme.colors.text.secondary} onPress={() => showAlert({ title: 'CPF', message: 'Para alterar o CPF, por favor contate o suporte.', confirmText: 'OK', showCancelButton: false })} />
          </View>

          {/* Email */}
          <View style={[styles.infoRow, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="email-outline" size={18} color={theme.colors.text.inverse} />
            </View>
            <View style={styles.infoTexts}>
              <Text style={[styles.infoLabel, { color: theme.colors.text.secondary, fontSize: fontSize.sm }]}>Email</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text.primary, fontSize: fontSize.md }]}>{userData.email || ''}</Text>
            </View>
            <IconButton icon="pencil" size={18} iconColor={theme.colors.text.secondary} onPress={() => openEditModal('email')} />
          </View>

          {/* Celular */}
          <View style={[styles.infoRow, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="phone" size={18} color={theme.colors.text.inverse} />
            </View>
            <View style={styles.infoTexts}>
              <Text style={[styles.infoLabel, { color: theme.colors.text.secondary, fontSize: fontSize.sm }]}>Celular</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text.primary, fontSize: fontSize.md }]}>{formatPhone(userData.celular || '')}</Text>
              
            </View>
            <IconButton icon="pencil" size={18} iconColor={theme.colors.text.secondary} onPress={() => openEditModal('celular')} />
          </View>

          {/* Endereço Completo */}
          <View style={[styles.infoRow, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="map-marker" size={18} color={theme.colors.text.inverse} />
            </View>
            <View style={styles.infoTexts}>
              <Text style={[styles.infoLabel, { color: theme.colors.text.secondary, fontSize: fontSize.sm }]}>Endereço Completo</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text.primary, fontSize: fontSize.md }]}>{userData.endereco || ''}</Text>
            </View>
            <IconButton icon="pencil" size={18} iconColor={theme.colors.text.secondary} onPress={() => openEditModal('endereco')} />
          </View>

          {/* Logout está disponível em Ações Rápidas; removido botão duplicado aqui */}
          {/* Ações Rápidas */}
          <View style={[styles.card, { backgroundColor: theme.colors.surface, padding: 12, marginTop: 16 }]}>
            <Text style={[styles.sectionTitle, { fontSize: fontSize.md, color: theme.colors.text.primary }]}>Ações Rápidas</Text>
            <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('Main', { screen: 'Configurações' })}>
              <MaterialCommunityIcons name="cog" size={18} color={theme.colors.primary} />
              <Text style={[styles.quickActionText, { color: theme.colors.text.primary, fontSize: fontSize.md }]}>Configurações</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={handleLogout}>
              <MaterialCommunityIcons name="power" size={18} color={theme.colors.error} />
              <Text style={[styles.quickActionText, { color: theme.colors.text.primary, fontSize: fontSize.md }]}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={handleDeleteAccount}>
              <MaterialCommunityIcons name="trash-can" size={18} color={theme.colors.error} />
              <Text style={[styles.quickActionText, { color: theme.colors.text.primary, fontSize: fontSize.md }]}>Apagar minha conta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <PasswordModal
        isVisible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSave={() => {
          // Lógica para salvar a senha (você pode passar uma função aqui)
          showAlert({
            title: 'Sucesso',
            message: 'Senha alterada com sucesso.',
            confirmColor: theme.colors.success,
            showCancelButton: false,
          });
          setShowPasswordModal(false);
        }}
        theme={theme}
        fontSize={fontSize}
        showAlert={showAlert}
      />
      {/* Edit field modal */}
      <Modal
        visible={editModal.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={closeEditModal}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { fontSize: fontSize.md, color: theme.colors.text.primary }]}>Editar {editModal.field === 'endereco' ? 'Endereço' : editModal.field}</Text>

            {editModal.field === 'endereco' ? (
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Logradouro</Text>
                <TextInput value={addressForm.logradouro} onChangeText={(t) => setAddressForm(prev => ({ ...prev, logradouro: t }))} style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text.primary }]} />
                <Text style={[styles.label, { color: theme.colors.text.secondary, marginTop: 8 }]}>Número</Text>
                <TextInput value={addressForm.numero} onChangeText={(t) => setAddressForm(prev => ({ ...prev, numero: t }))} style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text.primary }]} />
                <Text style={[styles.label, { color: theme.colors.text.secondary, marginTop: 8 }]}>Complemento</Text>
                <TextInput value={addressForm.complemento} onChangeText={(t) => setAddressForm(prev => ({ ...prev, complemento: t }))} style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text.primary }]} />
                <Text style={[styles.label, { color: theme.colors.text.secondary, marginTop: 8 }]}>Bairro</Text>
                <TextInput value={addressForm.bairro} onChangeText={(t) => setAddressForm(prev => ({ ...prev, bairro: t }))} style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text.primary }]} />
                <Text style={[styles.label, { color: theme.colors.text.secondary, marginTop: 8 }]}>Cidade</Text>
                <TextInput value={addressForm.cidade} onChangeText={(t) => setAddressForm(prev => ({ ...prev, cidade: t }))} style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text.primary }]} />
                <Text style={[styles.label, { color: theme.colors.text.secondary, marginTop: 8 }]}>Estado</Text>
                <TextInput value={addressForm.estado} onChangeText={(t) => setAddressForm(prev => ({ ...prev, estado: t }))} style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text.primary }]} />
                <Text style={[styles.label, { color: theme.colors.text.secondary, marginTop: 8 }]}>CEP</Text>
                <TextInput value={addressForm.cep} onChangeText={(t) => setAddressForm(prev => ({ ...prev, cep: t.replace(/\D/g, '').slice(0,8) }))} keyboardType="numeric" style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text.primary }]} />
                <TouchableOpacity onPress={() => fetchAddressByCEP(addressForm.cep)} style={[styles.button, { backgroundColor: theme.colors.primary, alignSelf: 'flex-start', marginTop: 8 }]}>
                  <Text style={[styles.buttonText, { color: theme.colors.text.inverse }]}>Buscar por CEP</Text>
                </TouchableOpacity>

                    <View style={styles.modalButtonRow}>
                      <TouchableOpacity onPress={closeEditModal} style={[styles.button, styles.buttonCancel, styles.modalActionButton]}>
                        <Text style={[styles.buttonText, { color: theme.colors.text.primary }]}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleSaveAddress} style={[styles.button, styles.modalActionButton, { backgroundColor: theme.colors.primary }]}>
                        <Text style={[styles.buttonText, { color: theme.colors.text.inverse }]}>Salvar Endereço</Text>
                      </TouchableOpacity>
                    </View>
              </ScrollView>
            ) : (
              <>
                {editModal.field === 'bio' ? (
                  <TextInput
                    value={bioEditing}
                    onChangeText={(text) => setBioEditing(text)}
                    placeholder={`Escreva sua bio`}
                    placeholderTextColor={theme.colors.text.secondary}
                    multiline
                    style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text.primary, height: 120, textAlignVertical: 'top' }]}
                  />
                ) : (
                  <TextInput
                    value={editModal.value}
                    onChangeText={(text) => {
                      let v = text;
                      if (editModal.field === 'cpf') v = formatCPF(text);
                      if (editModal.field === 'celular') v = formatPhone(text);
                      setEditModal(prev => ({ ...prev, value: v }));
                    }}
                    placeholder={`Digite ${editModal.field}`}
                    placeholderTextColor={theme.colors.text.secondary}
                    style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text.primary }]}
                  />
                )}
                <View style={styles.modalButtonRow}>
                  <TouchableOpacity onPress={closeEditModal} style={[styles.button, styles.buttonCancel, styles.modalActionButton]}>
                    <Text style={[styles.buttonText, { color: theme.colors.text.primary }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveField} style={[styles.button, styles.modalActionButton, { backgroundColor: theme.colors.primary }]}>
                    <Text style={[styles.buttonText, { color: theme.colors.text.inverse }]}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
        confirmColor={alertConfig.confirmColor}
        showCancelButton={alertConfig.showCancelButton}
        singleButtonText={alertConfig.confirmText || "OK"}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTop: {
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
  },
  nameText: {
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitleText: {
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  pointsContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  pointsNumber: {
    fontWeight: '700',
  },
  pointsLabel: {
    opacity: 0.8,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 30,
  },
  editProfileText: {
    fontWeight: '700',
  },
  userImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
  },
  userImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  passwordContainer: {
    marginTop: 20,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 15,
  },
  infoSection: {
    marginTop: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoTexts: {
    flex: 1,
  },
  infoLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontWeight: '500',
  },
  button: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 2,
  }, logoutText: {
    marginLeft: 10,
    fontWeight: 'bold',
  }, deleteAccountLink: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  deleteAccountLinkText: {
    textDecorationLine: 'underline',
    textAlign: 'center',
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '90%',
    maxWidth: 480,
    borderRadius: 14,
    padding: 16,
    elevation: 4,
  },
  buttonCancel: {
    backgroundColor: '#E0E0E0',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  modalActionButton: {
    flex: 0,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 8,
  },
  imageWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    marginBottom: 15,
  },
  cameraBadge: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    backgroundColor: '#14AE5C',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  quickActionText: {
    marginLeft: 10,
    fontWeight: '600',
  },
});
