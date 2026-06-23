import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string | null;
  display_name: string;
  role: string;
  location: string | null;
  device_registered: boolean;
  avatar_url: string | null;
}

export default function MembersScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const familyId = await AsyncStorage.getItem('familyId');
      
      if (!familyId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: true }); 

      if (error) throw error;
      
      if (data) {
        setMembers(data);
      }
    } catch (error: any) {
      console.log('Error fetching members:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderMemberCard = (member: FamilyMember) => {
    const hasAlert = !member.device_registered;

    return (
      <View key={member.id} style={[styles.memberCard, hasAlert && styles.memberCardAlert]}>
        
        {/* Top Info */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            {member.avatar_url ? (
               <Image source={{ uri: member.avatar_url }} style={styles.avatar} />
            ) : (
               <View style={styles.avatarPlaceholder}>
                 <MaterialCommunityIcons name="account" size={32} color="#94a3b8" />
               </View>
            )}
            {hasAlert && (
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>!</Text>
              </View>
            )}
          </View>
          
          <View style={styles.memberInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.memberName}>{member.display_name}</Text>
              <View style={[styles.statusDot, hasAlert ? styles.statusDotRed : styles.statusDotGreen]} />
            </View>
            <Text style={[styles.memberRole, hasAlert && styles.memberRoleAlert]}>{member.role}</Text>
            
            {hasAlert ? (
              <View style={styles.locationRow}>
                <MaterialCommunityIcons name="clock-alert-outline" size={14} color="#dc2626" />
                <Text style={styles.alertText}>ยังไม่ลงทะเบียนอุปกรณ์</Text>
              </View>
            ) : (
              <View style={styles.locationRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color="#64748b" />
                <Text style={styles.locationText}>{member.location || 'ห้องรับแขก'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.editBtn}>
            <MaterialCommunityIcons name="pencil-outline" size={16} color="#475569" style={{marginRight: 6}} />
            <Text style={styles.editBtnText}>แก้ไข</Text>
          </TouchableOpacity>
          
          {hasAlert ? (
            <TouchableOpacity style={styles.sosBtn}>
              <MaterialCommunityIcons name="asterisk" size={24} color="#ffffff" />
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.heartBtn}>
              <MaterialCommunityIcons name="heart" size={20} color="#059669" />
            </TouchableOpacity>
          )}
        </View>

      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header matching Dashboard/Profile */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoPlaceholder}>
            <MaterialCommunityIcons name="shield-account" size={20} color="#059669" />
          </View>
          <Text style={styles.headerTitle}>LOOKLANCARE</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
          <MaterialCommunityIcons name="account-outline" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>สมาชิกในครอบครัว</Text>
          <Text style={styles.pageSubtitle}>จัดการและดูแลคนที่คุณรักได้ที่นี่</Text>
        </View>

        <TouchableOpacity style={styles.addMemberBtn}>
          <MaterialCommunityIcons name="account-plus-outline" size={20} color="#ffffff" style={{marginRight: 8}} />
          <Text style={styles.addMemberBtnText}>เพิ่มสมาชิกใหม่</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={{ marginTop: 40 }}>
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : (
          <View style={styles.membersList}>
            {members.length > 0 ? (
              members.map(renderMemberCard)
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>ยังไม่มีสมาชิกในครอบครัว</Text>
                <Text style={styles.emptySubtext}>กรุณาสร้างครอบครัวในหน้าตั้งค่า หรือเพิ่มสมาชิกใหม่</Text>
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 32,
    height: 32,
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    letterSpacing: 1,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  pageHeader: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addMemberBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  membersList: {
    gap: 16,
  },
  memberCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  memberCardAlert: {
    borderColor: '#fca5a5',
    backgroundColor: '#fffdfd',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#059669',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotGreen: {
    backgroundColor: '#059669',
  },
  statusDotRed: {
    backgroundColor: '#0f172a', // or red
  },
  memberRole: {
    fontSize: 12,
    color: '#059669',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  memberRoleAlert: {
    color: '#b45309',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 4,
  },
  alertText: {
    fontSize: 11,
    color: '#dc2626',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 10,
    marginRight: 12,
  },
  editBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: 'bold',
  },
  heartBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  sosBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    backgroundColor: '#dc2626',
    borderRadius: 28,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sosText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: -2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  }
});
